/**
 * MagicLoom Habit Tracker - Main Application Orchestrator
 * Integrates Google Account Auth & True WebSocket Real-Time Sync.
 */

import { store } from './store.js';
import { syncEngine } from './syncEngine.js';
import { renderMonthlyView } from './monthlyView.js';
import { renderWeeklyView } from './weeklyView.js';
import { renderYearlyView } from './yearlyView.js';
import { renderManagerView } from './managerView.js';

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('appViewContainer');
  const navTabs = document.querySelectorAll('.nav-tab');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const syncStatusText = document.getElementById('syncStatusText');
  const googleAuthContainer = document.getElementById('googleAuthContainer');

  // Initialize theme
  document.documentElement.setAttribute('data-theme', store.state.theme || 'dark');

  // Tab switching handler
  function switchTab(tabName) {
    store.state.activeTab = tabName;
    store.saveState(false);

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

  // Google Login & Logout UI state updater
  function updateGoogleAuthUI(user) {
    if (!googleAuthContainer) return;

    if (user) {
      const userPhoto = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=10b981&color=fff`;
      const userName = user.displayName || user.email.split('@')[0];

      googleAuthContainer.innerHTML = `
        <div class="stat-pill" style="padding: 0.25rem 0.5rem; gap: 0.4rem; background: var(--bg-card); border-color: var(--accent-green);" title="Logged in as ${user.email}">
          <img src="${userPhoto}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" alt="Avatar">
          <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${userName}</span>
        </div>
        <button class="btn btn-secondary" id="googleLogoutBtn" style="font-size: 0.72rem; padding: 0.3rem 0.5rem; color: var(--text-muted);" title="Sign Out">
          Sign Out
        </button>
      `;

      const logoutBtn = googleAuthContainer.querySelector('#googleLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => syncEngine.logout());
      }
    } else {
      googleAuthContainer.innerHTML = `
        <button class="btn btn-secondary" id="googleLoginBtn" style="font-size: 0.78rem; padding: 0.35rem 0.7rem; border-color: #4285F4; color: #ffffff; background: rgba(66, 133, 244, 0.15);">
          <svg width="14" height="14" viewBox="0 0 24 24" style="margin-right: 4px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          Sign in with Google
        </button>
      `;

      const loginBtn = googleAuthContainer.querySelector('#googleLoginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => syncEngine.loginWithGoogle());
      }
    }
  }

  // Handle Google Auth state changes
  window.addEventListener('magicloom-auth-changed', (e) => {
    updateGoogleAuthUI(e.detail);
  });

  // Listen for Cloud Sync status changes
  syncEngine.onSync((status) => {
    if (syncStatusText) {
      if (status === 'syncing') {
        syncStatusText.textContent = 'Syncing...';
        syncStatusText.style.color = 'var(--accent-amber)';
      } else if (status === 'synced') {
        syncStatusText.textContent = 'Live Sync';
        syncStatusText.style.color = 'var(--accent-green)';
      } else if (status === 'error') {
        syncStatusText.textContent = 'Offline';
        syncStatusText.style.color = 'var(--text-muted)';
      }
    }
  });

  // Listen for remote cloud updates pushed over WebSocket from phone/laptop
  window.addEventListener('magicloom-cloud-synced', () => {
    switchTab(store.state.activeTab || 'monthly');
  });

  // Theme Toggle Listener
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      store.state.theme = newTheme;
      store.saveState(false);
    });
  }

  // Initial render based on saved active tab
  switchTab(store.state.activeTab || 'monthly');
});
