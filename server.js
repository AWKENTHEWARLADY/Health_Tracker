const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'health-tracker-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Database initialization
const db = new sqlite3.Database('./health.db', (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        age INTEGER,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  // Workouts table
  db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        duration INTEGER,
        intensity TEXT CHECK(intensity IN ('low', 'medium', 'high')),
        calories_burned INTEGER,
        notes TEXT,
        date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

  // Nutrition table
  db.run(`CREATE TABLE IF NOT EXISTS nutrition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        food_item TEXT,
        calories INTEGER,
        protein DECIMAL(5,2),
        carbs DECIMAL(5,2),
        fats DECIMAL(5,2),
        date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

  // Health metrics table
  db.run(`CREATE TABLE IF NOT EXISTS health_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        weight DECIMAL(5,2),
        height DECIMAL(5,2),
        blood_pressure TEXT,
        heart_rate INTEGER,
        sleep_hours DECIMAL(3,1),
        water_intake INTEGER,
        mood TEXT CHECK(mood IN ('excellent', 'good', 'fair', 'poor', 'terrible')),
        notes TEXT,
        date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

  // Medications table
  db.run(`CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        dosage TEXT,
        frequency TEXT,
        purpose TEXT,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

  // Create test user
  const createTestUser = async () => {
    try {
      const hashedPassword = await bcrypt.hash('password123', 12);
      db.run(
        'INSERT OR IGNORE INTO users (username, password, email, age, gender) VALUES (?, ?, ?, ?, ?)',
        [
          'testuser',
          hashedPassword,
          'test@example.com',
          30,
          'prefer-not-to-say',
        ],
        function (err) {
          if (err) {
            console.log('Test user error:', err);
          } else if (this.changes > 0) {
            console.log('👤 Test user created: testuser / password123');
          } else {
            console.log('👤 Test user already exists: testuser / password123');
          }
        }
      );
    } catch (error) {
      console.log('Error creating test user:', error);
    }
  };

  createTestUser();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email, age, gender } = req.body;

  try {
    if (!username || !password || !email) {
      return res
        .status(400)
        .json({ error: 'Username, password, and email are required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    db.run(
      'INSERT INTO users (username, password, email, age, gender) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, email, age, gender],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        req.session.userId = this.lastID;
        req.session.username = username;

        res.json({
          message: 'Account created successfully!',
          user: { id: this.lastID, username: username },
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }

      try {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
          req.session.userId = user.id;
          req.session.username = user.username;

          res.json({
            message: 'Login successful!',
            user: { id: user.id, username: user.username },
          });
        } else {
          res.status(400).json({ error: 'Invalid username or password' });
        }
      } catch (error) {
        console.error('Password comparison error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: { id: req.session.userId, username: req.session.username },
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Health data routes - Workouts
app.get('/api/health/workouts', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 50',
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error('Workouts fetch error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.post('/api/health/workouts', requireAuth, (req, res) => {
  console.log('📥 Received workout data:', req.body);

  const { type, duration, intensity, calories_burned, notes, date } = req.body;

  // Input validation
  if (!type || !duration || !intensity || !date) {
    console.log('❌ Missing required fields:', {
      type,
      duration,
      intensity,
      date,
    });
    return res
      .status(400)
      .json({
        error:
          'Missing required fields: type, duration, intensity, and date are required',
      });
  }

  db.run(
    'INSERT INTO workouts (user_id, type, duration, intensity, calories_burned, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      req.session.userId,
      type,
      parseInt(duration),
      intensity,
      parseInt(calories_burned || 0),
      notes,
      date,
    ],
    function (err) {
      if (err) {
        console.error('❌ Workout save error:', err);
        return res
          .status(500)
          .json({ error: 'Failed to save workout: ' + err.message });
      }
      console.log('✅ Workout saved successfully with ID:', this.lastID);
      res.json({
        id: this.lastID,
        message: 'Workout saved successfully!',
      });
    }
  );
});

app.delete('/api/health/workouts/:id', requireAuth, (req, res) => {
  db.run(
    'DELETE FROM workouts WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.userId],
    function (err) {
      if (err) {
        console.error('Workout delete error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Workout deleted successfully' });
    }
  );
});

// Health data routes - Nutrition
app.get('/api/health/nutrition', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM nutrition WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 50',
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error('Nutrition fetch error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.post('/api/health/nutrition', requireAuth, (req, res) => {
  console.log('📥 Received nutrition data:', req.body);

  const { meal_type, food_item, calories, protein, carbs, fats, date } =
    req.body;

  // Input validation
  if (!meal_type || !food_item || !calories || !date) {
    console.log('❌ Missing required fields:', {
      meal_type,
      food_item,
      calories,
      date,
    });
    return res
      .status(400)
      .json({
        error:
          'Missing required fields: meal_type, food_item, calories, and date are required',
      });
  }

  db.run(
    'INSERT INTO nutrition (user_id, meal_type, food_item, calories, protein, carbs, fats, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.session.userId,
      meal_type,
      food_item,
      parseInt(calories),
      parseFloat(protein || 0),
      parseFloat(carbs || 0),
      parseFloat(fats || 0),
      date,
    ],
    function (err) {
      if (err) {
        console.error('❌ Nutrition save error:', err);
        return res
          .status(500)
          .json({ error: 'Failed to save nutrition entry: ' + err.message });
      }
      console.log(
        '✅ Nutrition entry saved successfully with ID:',
        this.lastID
      );
      res.json({
        id: this.lastID,
        message: 'Nutrition entry saved successfully!',
      });
    }
  );
});

app.delete('/api/health/nutrition/:id', requireAuth, (req, res) => {
  db.run(
    'DELETE FROM nutrition WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.userId],
    function (err) {
      if (err) {
        console.error('Nutrition delete error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Nutrition entry deleted successfully' });
    }
  );
});

// Health data routes - Metrics
app.get('/api/health/metrics', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM health_metrics WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 50',
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error('Metrics fetch error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.post('/api/health/metrics', requireAuth, (req, res) => {
  console.log('📥 Received metrics data:', req.body);

  const {
    weight,
    height,
    blood_pressure,
    heart_rate,
    sleep_hours,
    water_intake,
    mood,
    notes,
    date,
  } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  db.run(
    'INSERT INTO health_metrics (user_id, weight, height, blood_pressure, heart_rate, sleep_hours, water_intake, mood, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.session.userId,
      parseFloat(weight || 0),
      parseFloat(height || 0),
      blood_pressure,
      parseInt(heart_rate || 0),
      parseFloat(sleep_hours || 0),
      parseInt(water_intake || 0),
      mood,
      notes,
      date,
    ],
    function (err) {
      if (err) {
        console.error('❌ Metrics save error:', err);
        return res
          .status(500)
          .json({ error: 'Failed to save health metrics: ' + err.message });
      }
      console.log('✅ Health metrics saved successfully with ID:', this.lastID);
      res.json({
        id: this.lastID,
        message: 'Health metrics saved successfully!',
      });
    }
  );
});

app.delete('/api/health/metrics/:id', requireAuth, (req, res) => {
  db.run(
    'DELETE FROM health_metrics WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.userId],
    function (err) {
      if (err) {
        console.error('Metrics delete error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Health metrics deleted successfully' });
    }
  );
});

// Health data routes - Medications
app.get('/api/health/medications', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM medications WHERE user_id = ? ORDER BY is_active DESC, start_date DESC LIMIT 50',
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error('Medications fetch error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.post('/api/health/medications', requireAuth, (req, res) => {
  console.log('📥 Received medication data:', req.body);

  const { name, dosage, frequency, purpose, start_date, end_date, is_active } =
    req.body;

  // Input validation
  if (!name || !dosage || !frequency || !start_date) {
    console.log('❌ Missing required fields:', {
      name,
      dosage,
      frequency,
      start_date,
    });
    return res
      .status(400)
      .json({
        error:
          'Missing required fields: name, dosage, frequency, and start_date are required',
      });
  }

  db.run(
    'INSERT INTO medications (user_id, name, dosage, frequency, purpose, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      req.session.userId,
      name,
      dosage,
      frequency,
      purpose,
      start_date,
      end_date,
      is_active ? 1 : 0,
    ],
    function (err) {
      if (err) {
        console.error('❌ Medication save error:', err);
        return res
          .status(500)
          .json({ error: 'Failed to save medication: ' + err.message });
      }
      console.log('✅ Medication saved successfully with ID:', this.lastID);
      res.json({
        id: this.lastID,
        message: 'Medication added successfully!',
      });
    }
  );
});

app.delete('/api/health/medications/:id', requireAuth, (req, res) => {
  db.run(
    'DELETE FROM medications WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.userId],
    function (err) {
      if (err) {
        console.error('Medication delete error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Medication deleted successfully' });
    }
  );
});

// Dashboard summary
app.get('/api/health/summary', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Get today's workouts
  db.get(
    `SELECT COUNT(*) as count, COALESCE(SUM(calories_burned), 0) as calories 
         FROM workouts WHERE user_id = ? AND date = ?`,
    [req.session.userId, today],
    (err, workoutRow) => {
      if (err) {
        console.error('Summary workouts error:', err);
        return res.status(500).json({ error: err.message });
      }

      // Get today's nutrition
      db.get(
        `SELECT COALESCE(SUM(calories), 0) as calories 
                 FROM nutrition WHERE user_id = ? AND date = ?`,
        [req.session.userId, today],
        (err, nutritionRow) => {
          if (err) {
            console.error('Summary nutrition error:', err);
            return res.status(500).json({ error: err.message });
          }

          // Get active medications
          db.get(
            `SELECT COUNT(*) as count 
                         FROM medications WHERE user_id = ? AND is_active = 1`,
            [req.session.userId],
            (err, medsRow) => {
              if (err) {
                console.error('Summary medications error:', err);
                return res.status(500).json({ error: err.message });
              }

              res.json({
                workouts_today: workoutRow || { count: 0, calories: 0 },
                nutrition_today: nutritionRow || { calories: 0 },
                active_medications: medsRow?.count || 0,
              });
            }
          );
        }
      );
    }
  );
});

// User profile
app.get('/api/user/profile', requireAuth, (req, res) => {
  db.get(
    'SELECT username, email, age, gender FROM users WHERE id = ?',
    [req.session.userId],
    (err, row) => {
      if (err) {
        console.error('Profile fetch error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(row || {});
    }
  );
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✨ ============================================== ✨`);
  console.log(`🏥          HEALTH TRACKER APPLICATION           🏥`);
  console.log(`✨ ============================================== ✨`);
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🔐 Login page: http://localhost:${PORT}/login.html`);
  console.log(`👤 Test credentials: testuser / password123`);
  console.log(`📊 Database: health.db (auto-created)`);
  console.log(`✨ ============================================== ✨\n`);
});
