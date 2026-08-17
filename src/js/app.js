/**
 * MagicLoom Habit Tracker - Main Application Orchestrator
 * Full-Screen Google Auth Gate & Lifetime Session Manager.
 */

import { store } from './store.js';
import { syncEngine } from './syncEngine.js';
import { renderMonthlyView } from './monthlyView.js';
import { renderWeeklyView } from './weeklyView.js';
import { renderYearlyView } from './yearlyView.js';
import { renderManagerView } from './managerView.js';

document.addEventListener('DOMContentLoaded', () => {
  const authGateOverlay = document.getElementById('authGateOverlay');
  const mainAppHeader = document.getElementById('mainAppHeader');
  const appContainer = document.getElementById('appViewContainer');
  const navTabs = document.querySelectorAll('.nav-tab');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const syncStatusText = document.getElementById('syncStatusText');
  const googleAuthContainer = document.getElementById('googleAuthContainer');
  const gateGoogleLoginBtn = document.getElementById('gateGoogleLoginBtn');
  const gateLoginBtnText = document.getElementById('gateLoginBtnText');

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

  // Handle Gate Sign-In Button Click
  if (gateGoogleLoginBtn) {
    gateGoogleLoginBtn.addEventListener('click', async () => {
      if (gateLoginBtnText) gateLoginBtnText.textContent = 'Connecting to Google...';
      try {
        await syncEngine.loginWithGoogle();
      } catch (err) {
        console.error('Login error:', err);
        if (gateLoginBtnText) gateLoginBtnText.textContent = 'Sign in with Google';
      }
    });
  }

  // Google Login & Logout UI state updater
  function updateAuthViewState(user) {
    if (user) {
      // User is logged in: Hide Gate, Show App UI
      if (authGateOverlay) authGateOverlay.style.display = 'none';
      if (mainAppHeader) mainAppHeader.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'block';

      // Update Header Auth Profile
      if (googleAuthContainer) {
        const userPhoto = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=10b981&color=fff`;
        const userName = user.displayName || user.email.split('@')[0];

        googleAuthContainer.innerHTML = `
          <div class="stat-pill" style="padding: 0.25rem 0.5rem; gap: 0.4rem; background: var(--bg-card); border-color: var(--accent-green);" title="Logged in as ${user.email}">
            <img src="${userPhoto}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" alt="Avatar">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${userName}</span>
          </div>
          <button class="btn btn-secondary" id="googleLogoutBtn" style="font-size: 0.72rem; padding: 0.3rem 0.5rem; color: var(--text-muted);" title="Sign Out">
            Sign Out
          </button>
        `;

        const logoutBtn = googleAuthContainer.querySelector('#googleLogoutBtn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => syncEngine.logout());
        }
      }

      // Render active view
      switchTab(store.state.activeTab || 'monthly');
    } else {
      // User is logged out: Show Gate Overlay, Hide App UI
      if (authGateOverlay) authGateOverlay.style.display = 'flex';
      if (mainAppHeader) mainAppHeader.style.display = 'none';
      if (appContainer) appContainer.style.display = 'none';

      if (gateLoginBtnText) gateLoginBtnText.textContent = 'Sign in with Google';
    }
  }

  // Handle Google Auth state changes
  window.addEventListener('magicloom-auth-changed', (e) => {
    updateAuthViewState(e.detail);
  });

  // Check initial user status from SyncEngine
  updateAuthViewState(syncEngine.getUser());

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
    if (syncEngine.getUser()) {
      switchTab(store.state.activeTab || 'monthly');
    }
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
});
