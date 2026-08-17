/**
 * MagicLoom Habit Tracker - Habit Manager & Backup Component
 */

import { store } from './store.js';

export function renderManagerView(container) {
  const habits = store.state.habits;

  container.innerHTML = `
    <div class="toolbar-card">
      <div class="toolbar-title-group">
        <h2 style="font-family: var(--font-heading); font-weight: 800; font-size: 1.3rem;">
          Habit Manager & Backup Settings
        </h2>
      </div>
    </div>

    <div class="manager-layout">
      
      <!-- Add New Habit Form -->
      <div class="analysis-panel">
        <div class="panel-title">
          <span>Add Custom Habit</span>
        </div>

        <form id="addHabitForm">
          <div class="form-group">
            <label class="form-label">Habit Title</label>
            <input type="text" id="habitTitleInput" class="form-control" placeholder="e.g. 10k Steps Daily" required>
          </div>

          <div class="form-group">
            <label class="form-label">Icon / Emoji</label>
            <input type="text" id="habitIconInput" class="form-control" placeholder="e.g. 🏃‍♂️ or 💧" value="⭐️" required>
          </div>

          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="habitCategoryInput" class="form-control">
              <option value="Health">Health & Fitness</option>
              <option value="Discipline">Discipline & Mindset</option>
              <option value="Productivity">Productivity & Work</option>
              <option value="Routine">Daily Routine</option>
              <option value="Growth">Personal Growth</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Monthly Target Days Goal</label>
            <input type="number" id="habitGoalInput" class="form-control" value="30" min="1" max="31">
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
            + Create Habit
          </button>
        </form>

        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;">

        <!-- Backup & Lifetime Data -->
        <div class="panel-title" style="font-size: 0.95rem;">
          <span>Data Preservation & Presets</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <button id="exportJsonBtn" class="btn btn-secondary" style="width: 100%;">
            📥 Backup Data (JSON)
          </button>
          <button id="importJsonBtn" class="btn btn-secondary" style="width: 100%;">
            📤 Restore Backup File
          </button>
          <input type="file" id="importFileInput" accept=".json" style="display: none;">
          
          <button id="loadSampleDemoBtn" class="btn btn-secondary" style="width: 100%; color: var(--accent-green); border-color: var(--accent-green);">
            ✨ Populate Sample Demo Data
          </button>

          <button id="resetDefaultsBtn" class="btn" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); width: 100%;">
            🗑️ Clear All & Start Blank
          </button>
        </div>

      </div>

      <!-- Current Habits Table -->
      <div class="spreadsheet-container" style="padding: 1.25rem;">
        <div class="panel-title" style="margin-bottom: 1rem;">
          <span>Current Active Habits (${habits.length})</span>
        </div>

        <table class="habit-manage-table">
          <thead>
            <tr>
              <th style="width: 50px;">Icon</th>
              <th>Habit Title</th>
              <th>Category</th>
              <th>Monthly Goal</th>
              <th style="width: 80px;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${habits.map(h => `
              <tr>
                <td style="text-align: center; font-size: 1.2rem;">${h.icon || '📌'}</td>
                <td style="font-weight: 600;">${h.title}</td>
                <td><span class="month-card-pct-badge" style="background: var(--bg-input); color: var(--text-secondary);">${h.category || 'General'}</span></td>
                <td style="font-family: var(--font-mono);">${h.goalMonthly || 30} Days</td>
                <td style="text-align: center;">
                  <button class="btn btn-icon delete-habit-btn" data-id="${h.id}" title="Delete Habit" style="color: var(--accent-red);">
                    🗑️
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

    </div>
  `;

  attachManagerEvents(container);
}

function attachManagerEvents(container) {
  // Add Habit Form
  const form = container.querySelector('#addHabitForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector('#habitTitleInput').value;
      const icon = container.querySelector('#habitIconInput').value;
      const category = container.querySelector('#habitCategoryInput').value;
      const goal = container.querySelector('#habitGoalInput').value;

      store.addHabit(title, icon, category, goal);
      renderManagerView(container);
    });
  }

  // Delete Habit Buttons
  const deleteBtns = container.querySelectorAll('.delete-habit-btn');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this habit?')) {
        store.deleteHabit(habitId);
        renderManagerView(container);
      }
    });
  });

  // Export JSON
  const exportBtn = container.querySelector('#exportJsonBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `magicloom_lifetime_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // Import JSON
  const importBtn = container.querySelector('#importJsonBtn');
  const importFileInput = container.querySelector('#importFileInput');
  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const importedState = JSON.parse(evt.target.result);
            store.state = importedState;
            store.saveState();
            alert('Backup data successfully restored!');
            renderManagerView(container);
          } catch (err) {
            alert('Invalid backup JSON file.');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // Load Sample Demo Data
  const sampleBtn = container.querySelector('#loadSampleDemoBtn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      if (confirm('Fill sample demo checkboxes and rating data?')) {
        const year = store.state.currentYear;
        const month = store.state.currentMonth;
        const key = store.getYearMonthKey(year, month);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        store.state.monthlyData[key] = { checks: {}, mood: {}, motivation: {} };
        const data = store.state.monthlyData[key];

        store.state.habits.forEach((h, habitIdx) => {
          data.checks[h.id] = {};
          for (let d = 1; d <= daysInMonth; d++) {
            data.checks[h.id][d] = ((habitIdx * 7 + d * 13) % 100) < 75;
          }
        });

        for (let d = 1; d <= daysInMonth; d++) {
          data.mood[d] = 7 + (d % 4);
          data.motivation[d] = 6 + ((d * 3) % 5);
        }

        store.saveState();
        renderManagerView(container);
      }
    });
  }

  // Reset to Blank
  const resetBtn = container.querySelector('#resetDefaultsBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Clear all logs and reset to a clean blank start?')) {
        store.clearAllData();
        renderManagerView(container);
      }
    });
  }
}
