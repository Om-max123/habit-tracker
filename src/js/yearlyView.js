/**
 * MagicLoom Habit Tracker - Yearly Dashboard Component
 * Dynamically linked to live Monthly Habit checks in real-time.
 */

import { store } from './store.js';

export function renderYearlyView(container) {
  const state = store.state;
  const currentYear = state.currentYear;
  const yearlyStats = store.getYearlyHabitStats(currentYear);

  container.innerHTML = `
    <!-- Yearly Toolbar -->
    <div class="toolbar-card">
      <div class="toolbar-title-group">
        <h2 style="font-family: var(--font-heading); font-weight: 800; font-size: 1.3rem;">
          Yearly Statistics (${currentYear})
        </h2>
      </div>
      <div class="summary-pills">
        <div class="stat-pill">
          <span class="stat-pill-label">Annual Consistency</span>
          <span class="stat-pill-value" style="color: var(--accent-green);">${yearlyStats.annualPct}%</span>
        </div>
      </div>
    </div>

    <!-- Yearly Overview Stat Cards -->
    <div class="yearly-stats-grid">
      <div class="yearly-stat-card">
        <div class="stat-icon-wrapper stat-icon-green">📈</div>
        <div>
          <div class="stat-card-number">${yearlyStats.annualPct}%</div>
          <div class="stat-card-title">Overall Annual Rate</div>
        </div>
      </div>
      <div class="yearly-stat-card">
        <div class="stat-icon-wrapper stat-icon-blue">✅</div>
        <div>
          <div class="stat-card-number">${yearlyStats.annualTotalCompleted.toLocaleString()}</div>
          <div class="stat-card-title">Habits Completed</div>
        </div>
      </div>
      <div class="yearly-stat-card">
        <div class="stat-icon-wrapper stat-icon-purple">🎯</div>
        <div>
          <div class="stat-card-number">${yearlyStats.annualTotalTarget.toLocaleString()}</div>
          <div class="stat-card-title">Total Target Logs</div>
        </div>
      </div>
      <div class="yearly-stat-card">
        <div class="stat-icon-wrapper stat-icon-amber">🔥</div>
        <div>
          <div class="stat-card-number">${yearlyStats.annualTotalCompleted > 0 ? 'Active' : '0 Days'}</div>
          <div class="stat-card-title">Consistency Streak</div>
        </div>
      </div>
    </div>

    <!-- Yearly Line Chart (Driven by live real-time checkmarks) -->
    <div class="chart-card">
      <div class="chart-header">
        <h3 style="font-family: var(--font-heading); font-weight: 700; font-size: 1.1rem;">
          12-Month Progress Trend (${currentYear})
        </h3>
        <span style="font-size: 0.8rem; color: var(--accent-green); font-weight: 600;">
          Live Data Synced across 12 Months
        </span>
      </div>
      <div class="chart-svg-container" style="height: 220px;">
        ${renderYearlyLineChartSVG(yearlyStats.monthlyBreakdown)}
      </div>
    </div>

    <!-- 12 Monthly Breakdown Cards Grid -->
    <h3 style="font-family: var(--font-heading); font-weight: 700; font-size: 1.2rem; margin: 1.5rem 0 1rem 0;">
      Monthly Breakdown (${currentYear})
    </h3>

    <div class="months-cards-grid">
      ${yearlyStats.monthlyBreakdown.map(m => `
        <div class="month-summary-card">
          <div class="month-card-header">
            <span class="month-card-title">${m.monthName}</span>
            <span class="month-card-pct-badge" style="background: ${m.pct > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)'}; color: ${m.pct > 0 ? 'var(--accent-green)' : 'var(--text-muted)'};">
              ${m.pct}%
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-secondary);">
            <span>Target Logs:</span>
            <strong style="color: var(--text-primary); font-family: var(--font-mono);">${m.totalHabits}</strong>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-secondary);">
            <span>Completed Habits:</span>
            <strong style="color: var(--accent-green); font-family: var(--font-mono);">${m.completed}</strong>
          </div>

          <div class="progress-bar-bg" style="margin-top: 0.2rem;">
            <div class="progress-bar-fill" style="width: ${m.pct}%;"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderYearlyLineChartSVG(monthlyList) {
  const svgWidth = 1000;
  const svgHeight = 200;
  const padding = 30;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const numPoints = monthlyList.length;
  const stepX = chartWidth / (numPoints - 1);

  const points = monthlyList.map((m, idx) => {
    const x = padding + idx * stepX;
    const y = svgHeight - padding - (m.pct / 100) * chartHeight;
    return { x, y, pct: m.pct, name: m.monthName };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;

  return `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none" style="width: 100%; height: 100%;">
      <defs>
        <linearGradient id="yearlyGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      <!-- Horizontal Axis Grid -->
      <line x1="${padding}" y1="${padding}" x2="${svgWidth - padding}" y2="${padding}" stroke="var(--border-subtle)" stroke-dasharray="4" />
      <line x1="${padding}" y1="${padding + chartHeight / 2}" x2="${svgWidth - padding}" y2="${padding + chartHeight / 2}" stroke="var(--border-subtle)" stroke-dasharray="4" />
      <line x1="${padding}" y1="${svgHeight - padding}" x2="${svgWidth - padding}" y2="${svgHeight - padding}" stroke="var(--border-color)" />

      <!-- Area Fill -->
      <path d="${areaD}" fill="url(#yearlyGradient)" />

      <!-- Line -->
      <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="3.5" stroke-linecap="round" />

      <!-- Data Nodes & Labels -->
      ${points.map(p => `
        <g class="chart-node">
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#3b82f6" stroke="#0a0e1a" stroke-width="2" />
          <text x="${p.x}" y="${svgHeight - 8}" text-anchor="middle" fill="var(--text-muted)" font-size="11" font-family="var(--font-mono)">
            ${p.name.substring(0, 3)}
          </text>
          <title>${p.name}: ${p.pct}%</title>
        </g>
      `).join('')}
    </svg>
  `;
}
