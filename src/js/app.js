/**
 * MagicLoom Habit Tracker - Main Application Orchestrator
 */

import { store } from './store.js';
import { renderMonthlyView } from './monthlyView.js';
import { renderWeeklyView } from './weeklyView.js';
import { renderYearlyView } from './yearlyView.js';
import { renderManagerView } from './managerView.js';

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('appViewContainer');
  const navTabs = document.querySelectorAll('.nav-tab');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  // Initialize theme
  document.documentElement.setAttribute('data-theme', store.state.theme || 'dark');

  // Tab switching handler
  function switchTab(tabName) {
    store.state.activeTab = tabName;
    store.saveState();

    navTabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Render corresponding view component
    if (tabName === 'monthly') renderMonthlyView(appContainer);
    else if (tabName === 'weekly') renderWeeklyView(appContainer);
    else if (tabName === 'yearly') renderYearlyView(appContainer);
    else if (tabName === 'manager') renderManagerView(appContainer);
  }

  // Attach tab click listeners
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Theme Toggle Listener
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      store.state.theme = newTheme;
      store.saveState();
    });
  }

  // Initial render based on saved active tab
  switchTab(store.state.activeTab || 'monthly');
});
