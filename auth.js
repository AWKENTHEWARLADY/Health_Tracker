class HealthFlowAuth {
  constructor() {
    this.currentForm = 'login';
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthStatus();
  }

  bindEvents() {
    // Form submissions
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Form switching
    const switchLink = document.getElementById('switchLink');
    if (switchLink) {
      switchLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleForms();
      });
    }
  }

  toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchText = document.getElementById('switchText');

    if (this.currentForm === 'login') {
      // Switch to register
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'block';
      if (switchText) {
        switchText.innerHTML =
          'Already have an account? <a href="#" id="switchLink">Sign in</a>';
      }
      this.currentForm = 'register';
    } else {
      // Switch to login
      if (registerForm) registerForm.style.display = 'none';
      if (loginForm) loginForm.style.display = 'block';
      if (switchText) {
        switchText.innerHTML =
          'Don\'t have an account? <a href="#" id="switchLink">Sign up now</a>';
      }
      this.currentForm = 'login';
    }

    // Re-bind the switch link
    const newSwitchLink = document.getElementById('switchLink');
    if (newSwitchLink) {
      newSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleForms();
      });
    }

    // Clear messages
    this.showMessage('', '');
  }

  async handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Basic validation
    if (!username || !password) {
      this.showMessage('Please fill in all fields', 'error');
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Signing In...';
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        this.showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        this.showMessage(data.error || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showMessage('Network error. Please try again.', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  async handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const age = document.getElementById('regAge').value;
    const gender = document.getElementById('regGender').value;

    // Validation
    if (!username || !email || !password) {
      this.showMessage('Please fill in all required fields', 'error');
      return;
    }

    if (password.length < 6) {
      this.showMessage('Password must be at least 6 characters long', 'error');
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Creating Account...';
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          age: age || null,
          gender: gender || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        this.showMessage(
          'Account created successfully! Redirecting...',
          'success'
        );
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        this.showMessage(data.error || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showMessage('Network error. Please try again.', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();

        if (
          data.authenticated &&
          window.location.pathname.includes('/login.html')
        ) {
          window.location.href = '/dashboard';
        }
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
    }
  }

  showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;

    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;

    if (!message) {
      messageDiv.style.display = 'none';
    } else {
      messageDiv.style.display = 'block';

      // Auto-hide success messages
      if (type === 'success') {
        setTimeout(() => {
          this.showMessage('', '');
        }, 5000);
      }
    }
  }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new HealthFlowAuth();
});
