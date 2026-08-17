/**
 * MagicLoom Habit Tracker - Weekly Planner & Tracker Component
 * Dynamically linked to live Monthly Habit checks in real-time.
 */

import { store } from './store.js';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL_NAMES = {
  'Mon': 'Monday',
  'Tue': 'Tuesday',
  'Wed': 'Wednesday',
  'Thu': 'Thursday',
  'Fri': 'Friday',
  'Sat': 'Saturday',
  'Sun': 'Sunday'
};

export function renderWeeklyView(container) {
  const state = store.state;
  const weeklyStats = store.getWeeklyHabitStats();
  const weeklyTasks = state.weeklyData.tasks || {};
  const weeklyNotes = state.weeklyData.notes || {};
  const weeklyImprovements = state.weeklyData.improvements || {};
  const weeklyGratitude = state.weeklyData.gratitude || {};

  // Calculate tasks completion %
  let totalTasks = 0;
  let completedTasks = 0;
  DAYS_OF_WEEK.forEach(day => {
    const list = weeklyTasks[day] || [];
    totalTasks += list.length;
    completedTasks += list.filter(t => t.completed).length;
  });
  
  // Combined Overall Weekly Discipline Score (70% Habits + 30% Tasks)
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overallWeeklyScore = Math.round(weeklyStats.overallWeeklyPct * 0.7 + taskPct * 0.3);

  container.innerHTML = `
    <div class="weekly-container">
      
      <!-- Top Weekly Overview Banner -->
      <div class="weekly-header-banner">
        <div class="gauge-donut-wrapper">
          <div class="donut-chart">
            ${renderDonutSVG(overallWeeklyScore, 110, 12)}
            <div class="donut-inner-text">${overallWeeklyScore}%</div>
          </div>
          <div>
            <h2 style="font-family: var(--font-heading); font-weight: 800; font-size: 1.5rem; margin-bottom: 0.25rem;">
              Weekly Planner & Real-Time Sync
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">
              Real-time synchronization with your active Monthly Habit checks and weekly execution planner.
            </p>
          </div>
        </div>

        <div class="summary-pills">
          <div class="stat-pill">
            <span class="stat-pill-label">Habits Checked</span>
            <span class="stat-pill-value" style="color: var(--accent-green);">${weeklyStats.totalHabitsDoneThisWeek} / ${weeklyStats.totalPossibleHabitsCheck}</span>
          </div>
          <div class="stat-pill">
            <span class="stat-pill-label">Tasks Done</span>
            <span class="stat-pill-value">${completedTasks} / ${totalTasks}</span>
          </div>
        </div>
      </div>

      <!-- Weekly Habit Execution Matrix (Driven by real-time habit checks) -->
      <div class="spreadsheet-container">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); font-family: var(--font-heading); font-weight: 700; display: flex; justify-content: space-between; align-items: center;">
          <span>Live Habit Matrix (This Week)</span>
          <span style="font-size: 0.78rem; color: var(--accent-green); font-weight: 600;">Synced with Monthly Grid</span>
        </div>
        <table class="spreadsheet-table">
          <thead>
            <tr>
              <th class="col-habit-name">Habit</th>
              ${weeklyStats.weekDaysInfo.map(wd => `
                <th style="min-width: 60px;">
                  <div>${wd.dayKey}</div>
                  <div style="font-size: 0.68rem; color: var(--text-muted);">${wd.dayNum}</div>
                </th>
              `).join('')}
              <th style="min-width: 70px;">Target</th>
              <th style="min-width: 70px;">Done</th>
              <th style="min-width: 80px;">Rate</th>
            </tr>
          </thead>
          <tbody>
            ${weeklyStats.habitRowsStats.map(hr => `
              <tr class="habit-row">
                <td class="col-habit-name">
                  <div class="habit-name-wrapper">
                    <span>${hr.icon || '📌'}</span> <span>${hr.title}</span>
                  </div>
                </td>
                ${hr.dayChecks.map(checked => `
                  <td style="text-align: center; color: ${checked ? 'var(--accent-green)' : 'var(--text-muted)'}; font-weight: 800; font-size: 0.9rem;">
                    ${checked ? '✓' : '—'}
                  </td>
                `).join('')}
                <td style="font-family: var(--font-mono); font-weight: 600;">7</td>
                <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-green);">${hr.doneCount}</td>
                <td>
                  <span class="month-card-pct-badge" style="background: ${hr.pct > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)'}; color: ${hr.pct > 0 ? 'var(--accent-green)' : 'var(--text-muted)'};">
                    ${hr.pct}%
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- 7 Daily Cards Grid (Mon - Sun) -->
      <div class="days-grid">
        ${DAYS_OF_WEEK.map((day, idx) => {
          const wd = weeklyStats.weekDaysInfo[idx];
          const tasks = weeklyTasks[day] || [];
          const dayDone = tasks.filter(t => t.completed).length;
          const dayTotal = tasks.length;
          const taskPctVal = dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0;
          const noteText = weeklyNotes[day] || '';
          const impText = weeklyImprovements[day] || '';
          const gratText = weeklyGratitude[day] || '';

          return `
            <div class="day-card" data-day="${day}">
              <!-- Header with mini donut -->
              <div class="day-card-header">
                <div>
                  <div class="day-card-title">${DAY_FULL_NAMES[day]}</div>
                  <div class="day-card-date">${wd ? wd.dateFormatted : 'Daily Focus'}</div>
                </div>
                <div class="mini-donut">
                  ${renderDonutSVG(taskPctVal, 50, 6)}
                  <div class="mini-donut-text">${taskPctVal}%</div>
                </div>
              </div>

              <!-- Tasks Section -->
              <div>
                <div class="task-section-title">
                  <span>Tasks</span>
                  <span>${dayDone}/${dayTotal}</span>
                </div>
                
                <div class="tasks-list" data-day="${day}">
                  ${tasks.map(t => `
                    <div class="task-item ${t.completed ? 'completed' : ''}">
                      <input type="checkbox" class="task-checkbox" data-day="${day}" data-task-id="${t.id}" ${t.completed ? 'checked' : ''}>
                      <label style="cursor: pointer; width: 100%;">${t.text}</label>
                    </div>
                  `).join('')}
                </div>

                <div class="add-task-input-group">
                  <input type="text" class="input-sm new-task-input" placeholder="+ Add a task..." data-day="${day}">
                  <button class="btn btn-primary add-task-btn" data-day="${day}" style="padding: 0.35rem 0.7rem; font-size: 0.75rem;">Add</button>
                </div>
              </div>

              <!-- Notes Section -->
              <div>
                <div class="task-section-title">Notes</div>
                <textarea class="card-textarea note-input" data-type="notes" data-day="${day}" placeholder="Key focus notes...">${noteText}</textarea>
              </div>

              <!-- What can be improved? -->
              <div>
                <div class="task-section-title" style="color: var(--accent-amber);">What can be improved?</div>
                <textarea class="card-textarea imp-input" data-type="improvements" data-day="${day}" placeholder="Reflection on improvements...">${impText}</textarea>
              </div>

              <!-- Thanks / Gratitude -->
              <div>
                <div class="task-section-title" style="color: var(--accent-purple);">Thanks & Gratitude</div>
                <textarea class="card-textarea grat-input" data-type="gratitude" data-day="${day}" placeholder="What are you grateful for today?">${gratText}</textarea>
              </div>

            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;

  attachWeeklyViewEvents(container);
}

function renderDonutSVG(percentage, size = 100, strokeWidth = 10) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
      <circle
        cx="${size / 2}" cy="${size / 2}" r="${radius}"
        stroke="var(--bg-input)" stroke-width="${strokeWidth}" fill="none"
      />
      <circle
        cx="${size / 2}" cy="${size / 2}" r="${radius}"
        stroke="var(--accent-green)" stroke-width="${strokeWidth}" fill="none"
        stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
        stroke-linecap="round" style="transition: stroke-dashoffset 0.5s ease;"
      />
    </svg>
  `;
}

function attachWeeklyViewEvents(container) {
  // Checkbox toggle tasks
  const taskCheckboxes = container.querySelectorAll('.task-checkbox');
  taskCheckboxes.forEach(chk => {
    chk.addEventListener('change', () => {
      const day = chk.getAttribute('data-day');
      const taskId = chk.getAttribute('data-task-id');
      store.toggleTask(day, taskId);
      renderWeeklyView(container);
    });
  });

  // Add task button
  const addBtns = container.querySelectorAll('.add-task-btn');
  addBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-day');
      const input = container.querySelector(`.new-task-input[data-day="${day}"]`);
      if (input && input.value.trim()) {
        store.addWeeklyTask(day, input.value.trim());
        renderWeeklyView(container);
      }
    });
  });

  // Add task Enter keypress
  const taskInputs = container.querySelectorAll('.new-task-input');
  taskInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        const day = input.getAttribute('data-day');
        store.addWeeklyTask(day, input.value.trim());
        renderWeeklyView(container);
      }
    });
  });

  // Textarea input changes
  const textareas = container.querySelectorAll('.card-textarea');
  textareas.forEach(tx => {
    tx.addEventListener('change', (e) => {
      const type = tx.getAttribute('data-type');
      const day = tx.getAttribute('data-day');
      store.saveWeeklyNote(type, day, e.target.value);
    });
  });
}
