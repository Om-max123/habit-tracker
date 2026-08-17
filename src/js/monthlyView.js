/**
 * MagicLoom Habit Tracker - Monthly Grid & Analysis Component
 * Interactive Range Sliders + Inline Add/Delete Habits + Slidebar Controls
 */

import { store } from './store.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MOOD_EMOJIS = { 0: '—', 1: '😫', 2: '🙁', 3: '😐', 4: '🙂', 5: '😊', 6: '😄', 7: '😁', 8: '😃', 9: '🌟', 10: '🤩' };
const MOTIVATION_EMOJIS = { 0: '—', 1: '🪫', 2: '💤', 3: '🔋', 4: '🏃', 5: '⚡️', 6: '💪', 7: '🔥', 8: '🚀', 9: '💥', 10: '👑' };

export function renderMonthlyView(container) {
  const state = store.state;
  const currentYear = state.currentYear;
  const currentMonth = state.currentMonth;
  const monthData = store.getCurrentMonthlyData();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const habits = state.habits;

  const todayObj = new Date();
  const isCurrentRealMonth = todayObj.getFullYear() === currentYear && todayObj.getMonth() === currentMonth;
  const todayDay = isCurrentRealMonth ? todayObj.getDate() : -1;

  // Calculate statistics per day
  const dailyStats = [];
  for (let d = 1; d <= daysInMonth; d++) {
    let done = 0;
    habits.forEach(h => {
      if (monthData.checks[h.id] && monthData.checks[h.id][d]) {
        done++;
      }
    });
    const total = habits.length;
    const notDone = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    dailyStats.push({ day: d, done, notDone, pct });
  }

  // Calculate overall monthly progress
  const totalChecksPossible = habits.length * daysInMonth;
  let totalChecked = 0;
  habits.forEach(h => {
    for (let d = 1; d <= daysInMonth; d++) {
      if (monthData.checks[h.id] && monthData.checks[h.id][d]) totalChecked++;
    }
  });
  const overallPct = totalChecksPossible > 0 ? Math.round((totalChecked / totalChecksPossible) * 100) : 0;

  container.innerHTML = `
    <!-- Top Toolbar Controls -->
    <div class="toolbar-card">
      <div class="toolbar-title-group">
        <h2 style="font-family: var(--font-heading); font-weight: 800; font-size: 1.3rem;">Monthly Tracker</h2>
        <select id="monthSelect" class="month-selector-select">
          ${MONTH_NAMES.map((name, idx) => `
            <option value="${idx}" ${idx === currentMonth ? 'selected' : ''}>${name} ${currentYear}</option>
          `).join('')}
        </select>

        ${isCurrentRealMonth ? `
          <button id="jumpTodayBtn" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.7rem;">
            📍 Jump to Today (Day ${todayDay})
          </button>
        ` : ''}
      </div>

      <div class="summary-pills">
        <div class="stat-pill">
          <span class="stat-pill-label">Habits Tracked</span>
          <span class="stat-pill-value">${habits.length}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-pill-label">Completed Logs</span>
          <span class="stat-pill-value">${totalChecked}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-pill-label">Overall Progress</span>
          <span class="stat-pill-value" style="color: var(--accent-green);">${overallPct}%</span>
        </div>
      </div>
    </div>

    <!-- Monthly Layout Grid (Spreadsheet + Analysis Panel) -->
    <div class="monthly-layout">
      
      <!-- Spreadsheet Table Container with Slidebar Scroll -->
      <div class="spreadsheet-container" id="monthlyGridScrollContainer">
        <table class="spreadsheet-table">
          <thead>
            <tr>
              <th class="col-habit-name">My Habits (${habits.length})</th>
              ${Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dateObj = new Date(currentYear, currentMonth, dayNum);
                const dayOfWeek = DAY_NAMES_SHORT[dateObj.getDay()];
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const isToday = dayNum === todayDay;

                return `
                  <th class="col-day-header ${isWeekend ? 'day-header-weekend' : ''} ${isToday ? 'day-header-today' : ''}" id="dayCol_${dayNum}">
                    <div class="day-number">${dayNum}</div>
                    <div class="day-name">${dayOfWeek}</div>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            <!-- Habit Rows -->
            ${habits.map(h => `
              <tr class="habit-row" data-habit-id="${h.id}">
                <td class="col-habit-name">
                  <div class="habit-name-wrapper" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden; text-overflow: ellipsis;">
                      <span class="habit-icon">${h.icon || '📌'}</span>
                      <span class="habit-title">${h.title}</span>
                    </div>
                    <button class="btn btn-icon delete-habit-inline-btn" data-habit-id="${h.id}" title="Delete Habit" style="width: 22px; height: 22px; border: none; background: transparent; color: var(--accent-red); opacity: 0.6; font-size: 0.8rem; cursor: pointer;">
                      🗑️
                    </button>
                  </div>
                </td>
                ${Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const isChecked = monthData.checks[h.id] && monthData.checks[h.id][dayNum];
                  return `
                    <td class="cell-checkbox" data-habit-id="${h.id}" data-day="${dayNum}">
                      <input type="checkbox" ${isChecked ? 'checked' : ''}>
                      <div class="custom-check">✓</div>
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}

            <!-- Quick Add Habit Inline Row -->
            <tr class="habit-row" style="background: var(--bg-surface);">
              <td class="col-habit-name" style="padding: 0.4rem 0.5rem !important;">
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <input type="text" id="inlineHabitIconInput" class="input-sm" value="🎯" style="width: 34px; text-align: center; padding: 0.2rem;" title="Emoji Icon">
                  <input type="text" id="inlineHabitTitleInput" class="input-sm" placeholder="+ Add custom habit..." style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                  <button id="inlineAddHabitBtn" class="btn btn-primary" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Add</button>
                </div>
              </td>
              <td colspan="${daysInMonth}" style="color: var(--text-muted); font-size: 0.75rem; text-align: left; padding-left: 1rem;">
                Type title & press Add to create habit instantly
              </td>
            </tr>

            <!-- Summary Rows Header -->
            <tr class="row-metric-header">
              <td class="col-habit-name">Progress %</td>
              ${dailyStats.map(s => `<td class="metric-val metric-pct">${s.pct}%</td>`).join('')}
            </tr>
            <tr class="row-metric-header">
              <td class="col-habit-name">Done Count</td>
              ${dailyStats.map(s => `<td class="metric-val metric-done">${s.done}</td>`).join('')}
            </tr>
            <tr class="row-metric-header">
              <td class="col-habit-name">Not Done Count</td>
              ${dailyStats.map(s => `<td class="metric-val metric-not-done">${s.notDone}</td>`).join('')}
            </tr>

            <!-- Interactive Mood Rating Slider Row -->
            <tr class="habit-row" style="background: var(--bg-surface);">
              <td class="col-habit-name" style="font-weight: 700; color: var(--accent-amber);">
                <div class="habit-name-wrapper">
                  <span>😊</span> <span>Mood Slider (1-10)</span>
                </div>
              </td>
              ${Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const val = (monthData.mood && monthData.mood[dayNum]) || 0;
                const emoji = MOOD_EMOJIS[val] || '—';
                return `
                  <td class="slider-rating-cell">
                    <div class="slider-wrapper">
                      <span class="slider-val-badge" id="moodBadge_${dayNum}">${val > 0 ? `${emoji} ${val}` : '—'}</span>
                      <input type="range" min="0" max="10" value="${val}" class="rating-range-slider mood-slider" data-type="mood" data-day="${dayNum}">
                    </div>
                  </td>
                `;
              }).join('')}
            </tr>

            <!-- Interactive Motivation Rating Slider Row -->
            <tr class="habit-row" style="background: var(--bg-surface);">
              <td class="col-habit-name" style="font-weight: 700; color: var(--accent-purple);">
                <div class="habit-name-wrapper">
                  <span>⚡</span> <span>Motivation Slider (1-10)</span>
                </div>
              </td>
              ${Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const val = (monthData.motivation && monthData.motivation[dayNum]) || 0;
                const emoji = MOTIVATION_EMOJIS[val] || '—';
                return `
                  <td class="slider-rating-cell">
                    <div class="slider-wrapper">
                      <span class="slider-val-badge motivation" id="motivationBadge_${dayNum}">${val > 0 ? `${emoji} ${val}` : '—'}</span>
                      <input type="range" min="0" max="10" value="${val}" class="rating-range-slider motivation mood-slider" data-type="motivation" data-day="${dayNum}">
                    </div>
                  </td>
                `;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Right Side Analysis Panel -->
      <div class="analysis-panel">
        <div class="panel-title">
          <span>Analysis</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Goal vs Actual</span>
        </div>

        <div class="analysis-list">
          ${habits.map(h => {
            let count = 0;
            for (let d = 1; d <= daysInMonth; d++) {
              if (monthData.checks[h.id] && monthData.checks[h.id][d]) count++;
            }
            const goal = h.goalMonthly || daysInMonth;
            const pct = Math.min(100, Math.round((count / goal) * 100));
            return `
              <div class="analysis-item">
                <div class="analysis-item-header">
                  <span class="analysis-habit-title">
                    <span>${h.icon || '📌'}</span>
                    <span>${h.title}</span>
                  </span>
                  <span class="analysis-counts">${count} / ${goal} (${pct}%)</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>

    <!-- Daily Progress Line/Area Chart Card -->
    <div class="chart-card">
      <div class="chart-header">
        <h3 style="font-family: var(--font-heading); font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">
          Daily Completion Rate Trend (${MONTH_NAMES[currentMonth]})
        </h3>
        <span style="font-size: 0.8rem; color: var(--accent-green); font-weight: 600;">
          Target: 80%+ Daily Consistency
        </span>
      </div>
      <div class="chart-svg-container" id="monthlyAreaChartContainer">
        ${renderAreaChartSVG(dailyStats)}
      </div>
    </div>
  `;

  attachMonthlyViewEvents(container, todayDay);
}

function renderAreaChartSVG(dailyStats) {
  if (!dailyStats || dailyStats.length === 0) return '';

  const svgWidth = 1000;
  const svgHeight = 160;
  const padding = 25;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const numPoints = dailyStats.length;
  const stepX = chartWidth / (numPoints - 1 || 1);

  const points = dailyStats.map((s, idx) => {
    const x = padding + idx * stepX;
    const y = svgHeight - padding - (s.pct / 100) * chartHeight;
    return { x, y, pct: s.pct, day: s.day };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;

  return `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none" style="width: 100%; height: 100%;">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <line x1="${padding}" y1="${padding}" x2="${svgWidth - padding}" y2="${padding}" stroke="var(--border-subtle)" stroke-dasharray="4" />
      <line x1="${padding}" y1="${padding + chartHeight / 2}" x2="${svgWidth - padding}" y2="${padding + chartHeight / 2}" stroke="var(--border-subtle)" stroke-dasharray="4" />
      <line x1="${padding}" y1="${svgHeight - padding}" x2="${svgWidth - padding}" y2="${svgHeight - padding}" stroke="var(--border-color)" />

      <!-- Area Fill -->
      <path d="${areaD}" fill="url(#areaGradient)" />

      <!-- Smooth Line -->
      <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />

      <!-- Data Dots -->
      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#10b981" stroke="#0a0e1a" stroke-width="2">
          <title>Day ${p.day}: ${p.pct}%</title>
        </circle>
      `).join('')}
    </svg>
  `;
}

function attachMonthlyViewEvents(container, todayDay) {
  // Month selector dropdown event
  const monthSelect = container.querySelector('#monthSelect');
  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      store.state.currentMonth = parseInt(e.target.value, 10);
      store.saveState();
      renderMonthlyView(container);
    });
  }

  // Jump to Today button click
  const jumpTodayBtn = container.querySelector('#jumpTodayBtn');
  if (jumpTodayBtn && todayDay > 0) {
    jumpTodayBtn.addEventListener('click', () => {
      const todayCol = container.querySelector(`#dayCol_${todayDay}`);
      const scrollContainer = container.querySelector('#monthlyGridScrollContainer');
      if (todayCol && scrollContainer) {
        scrollContainer.scrollTo({
          left: todayCol.offsetLeft - 240,
          behavior: 'smooth'
        });
      }
    });
  }

  // Inline Add Habit button & enter key
  const inlineAddBtn = container.querySelector('#inlineAddHabitBtn');
  const inlineTitleInput = container.querySelector('#inlineHabitTitleInput');
  const inlineIconInput = container.querySelector('#inlineHabitIconInput');

  function handleAddInlineHabit() {
    if (inlineTitleInput && inlineTitleInput.value.trim()) {
      const icon = (inlineIconInput && inlineIconInput.value.trim()) || '🎯';
      store.addHabit(inlineTitleInput.value, icon);
      renderMonthlyView(container);
    }
  }

  if (inlineAddBtn) {
    inlineAddBtn.addEventListener('click', handleAddInlineHabit);
  }
  if (inlineTitleInput) {
    inlineTitleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddInlineHabit();
    });
  }

  // Inline Delete Habit buttons
  const deleteButtons = container.querySelectorAll('.delete-habit-inline-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const habitId = btn.getAttribute('data-habit-id');
      if (confirm('Delete this habit from your tracker?')) {
        store.deleteHabit(habitId);
        renderMonthlyView(container);
      }
    });
  });

  // Checkbox toggle clicks
  const checkboxCells = container.querySelectorAll('.cell-checkbox');
  checkboxCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const habitId = cell.getAttribute('data-habit-id');
      const day = parseInt(cell.getAttribute('data-day'), 10);
      store.toggleHabitCheck(habitId, day);
      renderMonthlyView(container);
    });
  });

  // Range Slider Input Handlers (Mood & Motivation)
  const rangeSliders = container.querySelectorAll('.rating-range-slider');
  rangeSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const type = slider.getAttribute('data-type');
      const day = parseInt(slider.getAttribute('data-day'), 10);
      const val = parseInt(e.target.value, 10);

      if (type === 'mood') {
        const badge = container.querySelector(`#moodBadge_${day}`);
        if (badge) badge.textContent = val > 0 ? `${MOOD_EMOJIS[val] || ''} ${val}` : '—';
      } else if (type === 'motivation') {
        const badge = container.querySelector(`#motivationBadge_${day}`);
        if (badge) badge.textContent = val > 0 ? `${MOTIVATION_EMOJIS[val] || ''} ${val}` : '—';
      }
    });

    slider.addEventListener('change', (e) => {
      const type = slider.getAttribute('data-type');
      const day = parseInt(slider.getAttribute('data-day'), 10);
      store.setRating(type, day, e.target.value);
    });
  });
}
