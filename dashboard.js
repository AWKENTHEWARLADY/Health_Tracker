class HealthFlowDashboard {
  constructor() {
    this.currentSection = 'dashboard';
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadUserData();
    this.setCurrentDate();
    this.setDefaultDates();
    this.loadDashboardData();
  }

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.getAttribute('data-section');
        this.switchSection(section);
      });
    });

    // Quick actions
    document.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const section = e.currentTarget.getAttribute('data-section');
        this.switchSection(section);
      });
    });

    // Form submissions
    document
      .getElementById('workoutForm')
      ?.addEventListener('submit', (e) => this.handleWorkoutSubmit(e));
    document
      .getElementById('nutritionForm')
      ?.addEventListener('submit', (e) => this.handleNutritionSubmit(e));
    document
      .getElementById('metricsForm')
      ?.addEventListener('submit', (e) => this.handleMetricsSubmit(e));
    document
      .getElementById('medicationsForm')
      ?.addEventListener('submit', (e) => this.handleMedicationsSubmit(e));

    // Logout
    document
      .getElementById('logoutBtn')
      ?.addEventListener('click', () => this.handleLogout());
  }

  switchSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-section="${section}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Update content
    document.querySelectorAll('.content-section').forEach((content) => {
      content.classList.remove('active');
    });
    const activeSection = document.getElementById(section);
    if (activeSection) activeSection.classList.add('active');

    // Update page title
    this.updatePageTitle(section);

    // Load section data
    this.loadSectionData(section);

    this.currentSection = section;
  }

  updatePageTitle(section) {
    const titles = {
      dashboard: 'Dashboard',
      workouts: 'Workout Tracking',
      nutrition: 'Nutrition Tracking',
      health: 'Health Metrics',
      medications: 'Medication Management',
    };

    const subtitles = {
      dashboard: "Welcome back! Here's your health overview.",
      workouts: 'Log your exercises and track your fitness journey',
      nutrition: 'Monitor your meals and nutritional intake',
      health: 'Track your vital signs and health indicators',
      medications: 'Track your medications and supplements',
    };

    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    if (pageTitle) pageTitle.textContent = titles[section] || 'Dashboard';
    if (pageSubtitle)
      pageSubtitle.textContent = subtitles[section] || 'Health Tracker';
  }

  async loadSectionData(section) {
    switch (section) {
      case 'dashboard':
        await this.loadDashboardData();
        break;
      case 'workouts':
        await this.loadWorkouts();
        break;
      case 'nutrition':
        await this.loadNutrition();
        break;
      case 'health':
        await this.loadHealthMetrics();
        break;
      case 'medications':
        await this.loadMedications();
        break;
    }
  }

  async loadUserData() {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
          usernameDisplay.textContent = userData.username || 'User';
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  setCurrentDate() {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
      dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach((input) => {
      input.value = today;
    });
  }

  async loadDashboardData() {
    try {
      const [summaryResponse, workoutsResponse, nutritionResponse] =
        await Promise.all([
          fetch('/api/health/summary'),
          fetch('/api/health/workouts?limit=3'),
          fetch('/api/health/nutrition?limit=3'),
        ]);

      if (summaryResponse.ok) {
        const summary = await summaryResponse.json();
        this.updateDashboardSummary(summary);
      }

      if (workoutsResponse.ok && nutritionResponse.ok) {
        const workouts = await workoutsResponse.json();
        const nutrition = await nutritionResponse.json();
        this.updateRecentActivity(workouts, nutrition);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  updateDashboardSummary(summary) {
    const todayCalories = document.getElementById('todayCalories');
    const todayWorkouts = document.getElementById('todayWorkouts');
    const todayCaloriesConsumed = document.getElementById(
      'todayCaloriesConsumed'
    );
    const activeMeds = document.getElementById('activeMeds');

    if (todayCalories)
      todayCalories.textContent = summary.workouts_today?.calories || 0;
    if (todayWorkouts)
      todayWorkouts.textContent = summary.workouts_today?.count || 0;
    if (todayCaloriesConsumed)
      todayCaloriesConsumed.textContent =
        summary.nutrition_today?.calories || 0;
    if (activeMeds) activeMeds.textContent = summary.active_medications || 0;
  }

  updateRecentActivity(workouts, nutrition) {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

    const activities = [];

    // Add workouts
    if (workouts && workouts.length > 0) {
      workouts.slice(0, 3).forEach((workout) => {
        activities.push({
          type: 'workout',
          text: `${workout.type} - ${workout.duration}min`,
          time: new Date(workout.date).toLocaleDateString(),
          icon: '💪',
        });
      });
    }

    // Add nutrition entries
    if (nutrition && nutrition.length > 0) {
      nutrition.slice(0, 3).forEach((entry) => {
        activities.push({
          type: 'nutrition',
          text: `${entry.meal_type}: ${entry.food_item}`,
          time: new Date(entry.date).toLocaleDateString(),
          icon: '🍎',
        });
      });
    }

    // Sort by date (most recent first) and take top 5
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    activities.splice(5);

    if (activities.length === 0) {
      activityList.innerHTML =
        '<div class="no-data">No recent activity. Start tracking your health journey!</div>';
      return;
    }

    activityList.innerHTML = activities
      .map(
        (activity) => `
            <div class="activity-item activity-${activity.type}">
                <div class="activity-icon">
                    ${activity.icon}
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `
      )
      .join('');
  }

  // Form submission methods
  async handleWorkoutSubmit(e) {
    e.preventDefault();

    const formData = {
      type: document.getElementById('workoutType').value,
      duration: document.getElementById('workoutDuration').value,
      intensity: document.getElementById('workoutIntensity').value,
      calories_burned: document.getElementById('workoutCalories').value || 0,
      notes: document.getElementById('workoutNotes').value,
      date: document.getElementById('workoutDate').value,
    };

    await this.submitForm('/api/health/workouts', formData, 'Workout', e);
  }

  async handleNutritionSubmit(e) {
    e.preventDefault();

    const formData = {
      meal_type: document.getElementById('mealType').value,
      food_item: document.getElementById('foodItem').value,
      calories: document.getElementById('foodCalories').value,
      protein: document.getElementById('foodProtein').value || 0,
      carbs: document.getElementById('foodCarbs').value || 0,
      fats: document.getElementById('foodFats').value || 0,
      date: document.getElementById('nutritionDate').value,
    };

    await this.submitForm(
      '/api/health/nutrition',
      formData,
      'Nutrition entry',
      e
    );
  }

  async handleMetricsSubmit(e) {
    e.preventDefault();

    const formData = {
      weight: document.getElementById('weight').value,
      height: document.getElementById('height').value,
      blood_pressure: document.getElementById('bloodPressure').value,
      heart_rate: document.getElementById('heartRate').value,
      sleep_hours: document.getElementById('sleepHours').value,
      water_intake: document.getElementById('waterIntake').value,
      mood: document.getElementById('mood').value,
      notes: document.getElementById('healthNotes').value,
      date: document.getElementById('metricsDate').value,
    };

    await this.submitForm('/api/health/metrics', formData, 'Health metrics', e);
  }

  async handleMedicationsSubmit(e) {
    e.preventDefault();

    const formData = {
      name: document.getElementById('medName').value,
      dosage: document.getElementById('medDosage').value,
      frequency: document.getElementById('medFrequency').value,
      purpose: document.getElementById('medPurpose').value,
      start_date: document.getElementById('medStartDate').value,
      end_date: document.getElementById('medEndDate').value,
      is_active: document.getElementById('medIsActive').checked,
    };

    await this.submitForm('/api/health/medications', formData, 'Medication', e);
  }

  async submitForm(url, data, itemName, event) {
    const submitBtn = event.submitter;
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = 'Saving...';
    submitBtn.disabled = true;

    try {
      console.log('🔄 Submitting data to:', url, data);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('📨 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Server response:', result);

      if (result.message) {
        this.showToast(result.message, 'success');
        event.target.reset();
        this.setDefaultDates();

        // Reload the appropriate data
        switch (url) {
          case '/api/health/workouts':
            await this.loadWorkouts();
            break;
          case '/api/health/nutrition':
            await this.loadNutrition();
            break;
          case '/api/health/metrics':
            await this.loadHealthMetrics();
            break;
          case '/api/health/medications':
            await this.loadMedications();
            break;
        }

        // Reload dashboard to update summaries
        await this.loadDashboardData();
      } else {
        this.showToast(
          result.error || `Failed to save ${itemName.toLowerCase()}`,
          'error'
        );
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
      this.showToast(
        'Network error. Please check console for details.',
        'error'
      );
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  // Data loading methods
  async loadWorkouts() {
    try {
      const response = await fetch('/api/health/workouts');
      if (response.ok) {
        const workouts = await response.json();
        this.displayWorkouts(workouts);
      }
    } catch (error) {
      console.error('Failed to load workouts:', error);
    }
  }

  async loadNutrition() {
    try {
      const response = await fetch('/api/health/nutrition');
      if (response.ok) {
        const nutrition = await response.json();
        this.displayNutrition(nutrition);
      }
    } catch (error) {
      console.error('Failed to load nutrition:', error);
    }
  }

  async loadHealthMetrics() {
    try {
      const response = await fetch('/api/health/metrics');
      if (response.ok) {
        const metrics = await response.json();
        this.displayHealthMetrics(metrics);
      }
    } catch (error) {
      console.error('Failed to load health metrics:', error);
    }
  }

  async loadMedications() {
    try {
      const response = await fetch('/api/health/medications');
      if (response.ok) {
        const medications = await response.json();
        this.displayMedications(medications);
      }
    } catch (error) {
      console.error('Failed to load medications:', error);
    }
  }

  // Data display methods
  displayWorkouts(workouts) {
    const container = document.getElementById('workoutsList');
    if (!container) return;

    if (!workouts || workouts.length === 0) {
      container.innerHTML =
        '<div class="no-data">No workouts recorded yet. Start your fitness journey!</div>';
      return;
    }

    container.innerHTML = workouts
      .map(
        (workout) => `
            <div class="data-item">
                <div class="data-item-main">
                    <div class="data-item-title">${workout.type}</div>
                    <div class="data-item-details">
                        <span>${workout.duration} minutes</span>
                        <span>${workout.intensity} intensity</span>
                        <span>${workout.calories_burned} calories</span>
                    </div>
                    ${
                      workout.notes
                        ? `<div style="margin-top: 0.75rem; color: var(--gray-600); font-style: italic;">${workout.notes}</div>`
                        : ''
                    }
                </div>
                <div class="data-item-actions">
                    <small>${new Date(
                      workout.date
                    ).toLocaleDateString()}</small>
                    <button class="delete-btn" onclick="healthFlow.deleteWorkout(${
                      workout.id
                    })">
                        Delete
                    </button>
                </div>
            </div>
        `
      )
      .join('');
  }

  displayNutrition(nutrition) {
    const container = document.getElementById('nutritionList');
    if (!container) return;

    if (!nutrition || nutrition.length === 0) {
      container.innerHTML =
        '<div class="no-data">No nutrition entries yet. Start tracking your meals!</div>';
      return;
    }

    container.innerHTML = nutrition
      .map(
        (entry) => `
            <div class="data-item">
                <div class="data-item-main">
                    <div class="data-item-title">${
                      entry.meal_type.charAt(0).toUpperCase() +
                      entry.meal_type.slice(1)
                    }: ${entry.food_item}</div>
                    <div class="data-item-details">
                        <span>${entry.calories} cal</span>
                        <span>P: ${entry.protein}g</span>
                        <span>C: ${entry.carbs}g</span>
                        <span>F: ${entry.fats}g</span>
                    </div>
                </div>
                <div class="data-item-actions">
                    <small>${new Date(entry.date).toLocaleDateString()}</small>
                    <button class="delete-btn" onclick="healthFlow.deleteNutrition(${
                      entry.id
                    })">
                        Delete
                    </button>
                </div>
            </div>
        `
      )
      .join('');
  }

  displayHealthMetrics(metrics) {
    const container = document.getElementById('metricsList');
    if (!container) return;

    if (!metrics || metrics.length === 0) {
      container.innerHTML =
        '<div class="no-data">No health metrics recorded yet. Start monitoring your health!</div>';
      return;
    }

    container.innerHTML = metrics
      .map((metric) => {
        const details = [];
        if (metric.weight) details.push(`Weight: ${metric.weight}kg`);
        if (metric.blood_pressure) details.push(`BP: ${metric.blood_pressure}`);
        if (metric.heart_rate) details.push(`HR: ${metric.heart_rate}bpm`);
        if (metric.sleep_hours) details.push(`Sleep: ${metric.sleep_hours}h`);
        if (metric.water_intake)
          details.push(`Water: ${metric.water_intake}ml`);
        if (metric.mood) {
          const moodEmojis = {
            excellent: '😊',
            good: '🙂',
            fair: '😐',
            poor: '😕',
            terrible: '😞',
          };
          details.push(`Mood: ${moodEmojis[metric.mood] || metric.mood}`);
        }

        return `
                <div class="data-item">
                    <div class="data-item-main">
                        <div class="data-item-title">Health Check</div>
                        <div class="data-item-details">
                            ${details
                              .map((detail) => `<span>${detail}</span>`)
                              .join('')}
                        </div>
                        ${
                          metric.notes
                            ? `<div style="margin-top: 0.75rem; color: var(--gray-600); font-style: italic;">${metric.notes}</div>`
                            : ''
                        }
                    </div>
                    <div class="data-item-actions">
                        <small>${new Date(
                          metric.date
                        ).toLocaleDateString()}</small>
                        <button class="delete-btn" onclick="healthFlow.deleteHealthMetric(${
                          metric.id
                        })">
                            Delete
                        </button>
                    </div>
                </div>
            `;
      })
      .join('');
  }

  displayMedications(medications) {
    const container = document.getElementById('medicationsList');
    if (!container) return;

    if (!medications || medications.length === 0) {
      container.innerHTML =
        '<div class="no-data">No medications recorded yet. Start managing your medications!</div>';
      return;
    }

    container.innerHTML = medications
      .map(
        (med) => `
            <div class="data-item">
                <div class="data-item-main">
                    <div class="data-item-title">${med.name} 
                        <span style="background: ${
                          med.is_active ? '#d1fae5' : '#f3f4f6'
                        }; color: ${
          med.is_active ? '#065f46' : '#6b7280'
        }; padding: 0.375rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; margin-left: 0.75rem; font-weight: 600;">
                            ${med.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="data-item-details">
                        <span>Dosage: ${med.dosage}</span>
                        <span>Frequency: ${med.frequency}</span>
                        ${
                          med.purpose
                            ? `<span>Purpose: ${med.purpose}</span>`
                            : ''
                        }
                    </div>
                    <div class="data-item-details">
                        <small>Start: ${new Date(
                          med.start_date
                        ).toLocaleDateString()}</small>
                        ${
                          med.end_date
                            ? `<small>End: ${new Date(
                                med.end_date
                              ).toLocaleDateString()}</small>`
                            : ''
                        }
                    </div>
                </div>
                <div class="data-item-actions">
                    <button class="delete-btn" onclick="healthFlow.deleteMedication(${
                      med.id
                    })">
                        Delete
                    </button>
                </div>
            </div>
        `
      )
      .join('');
  }

  // Delete methods
  async deleteWorkout(id) {
    if (confirm('Are you sure you want to delete this workout?')) {
      await this.deleteItem(`/api/health/workouts/${id}`, 'Workout');
      this.loadWorkouts();
      this.loadDashboardData();
    }
  }

  async deleteNutrition(id) {
    if (confirm('Are you sure you want to delete this nutrition entry?')) {
      await this.deleteItem(`/api/health/nutrition/${id}`, 'Nutrition entry');
      this.loadNutrition();
      this.loadDashboardData();
    }
  }

  async deleteHealthMetric(id) {
    if (confirm('Are you sure you want to delete this health metric?')) {
      await this.deleteItem(`/api/health/metrics/${id}`, 'Health metric');
      this.loadHealthMetrics();
    }
  }

  async deleteMedication(id) {
    if (confirm('Are you sure you want to delete this medication?')) {
      await this.deleteItem(`/api/health/medications/${id}`, 'Medication');
      this.loadMedications();
    }
  }

  async deleteItem(url, itemName) {
    try {
      const response = await fetch(url, { method: 'DELETE' });
      const result = await response.json();

      if (response.ok) {
        this.showToast(`${itemName} deleted successfully`, 'success');
      } else {
        this.showToast(
          result.error || `Failed to delete ${itemName.toLowerCase()}`,
          'error'
        );
      }
    } catch (error) {
      console.error(`Delete error for ${url}:`, error);
      this.showToast('Network error. Please try again.', 'error');
    }
  }

  // Toast notifications
  showToast(message, type) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;

    // Add to page
    document.body.appendChild(toast);

    // Add styles if not already added
    if (!document.getElementById('toast-styles')) {
      const styles = document.createElement('style');
      styles.id = 'toast-styles';
      styles.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    padding: 1rem 1.5rem;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xl);
                    border-left: 4px solid var(--primary);
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                    z-index: 10000;
                    max-width: 400px;
                    min-width: 300px;
                }
                .toast-success { border-left-color: var(--success); }
                .toast-error { border-left-color: var(--error); }
                .toast.show { transform: translateX(0); }
                .toast-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }
                .toast-message {
                    flex: 1;
                    font-weight: 500;
                }
                .toast-close {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    cursor: pointer;
                    color: var(--gray-500);
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .toast-close:hover {
                    color: var(--gray-700);
                }
            `;
      document.head.appendChild(styles);
    }

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  async handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
      try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
          window.location.href = '/login.html';
        }
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  }
}

// Initialize dashboard when DOM is loaded
let healthFlow;
document.addEventListener('DOMContentLoaded', () => {
  healthFlow = new HealthFlowDashboard();
});
