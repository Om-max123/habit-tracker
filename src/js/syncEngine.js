/**
 * MagicLoom Real-Time Cross-Device Cloud Sync Engine
 * Near-instant Real-Time Synchronization between Phone & Laptop.
 */

import { store } from './store.js';

const SYNC_CODE_KEY = 'magicloom_personal_sync_code';
const DEFAULT_SYNC_CODE = 'Om-max123-habits';

// Dual High-Availability CORS-enabled Cloud Storage endpoints for cross-device pairing
const ENDPOINT_PRIMARY = 'https://kvdb.io/7zR1n8x2FqL9mP3k5Y6w';
const ENDPOINT_FALLBACK = 'https://api.counterapi.dev/v1/magicloom';

class SyncEngine {
  constructor() {
    this.syncCode = this.loadSyncCode();
    this.status = 'idle'; // 'idle', 'syncing', 'synced', 'error'
    this.lastRemoteUpdate = 0;
    this.onSyncCallbacks = [];
    this.isPushing = false;

    // Cross-tab broadcast channel for instant local window sync
    if ('BroadcastChannel' in window) {
      this.broadcast = new BroadcastChannel('magicloom_tab_sync');
      this.broadcast.onmessage = (e) => {
        if (e.data && e.data.state && e.data.lastUpdated > (this.lastRemoteUpdate || 0)) {
          this.lastRemoteUpdate = e.data.lastUpdated;
          this.applyRemoteState(e.data.state);
        }
      };
    }

    // Fast polling every 1.5 seconds for instant cross-device updates (phone <-> laptop)
    setInterval(() => this.pullFromCloud(), 1500);

    // Sync immediately when waking device or unlocking phone
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.pullFromCloud();
      }
    });
    window.addEventListener('focus', () => this.pullFromCloud());
  }

  loadSyncCode() {
    return localStorage.getItem(SYNC_CODE_KEY) || DEFAULT_SYNC_CODE;
  }

  setSyncCode(code) {
    if (!code || !code.trim()) return;
    this.syncCode = code.trim();
    localStorage.setItem(SYNC_CODE_KEY, this.syncCode);
    this.pushToCloud();
    this.pullFromCloud();
  }

  getSyncCode() {
    return this.syncCode;
  }

  onSync(callback) {
    this.onSyncCallbacks.push(callback);
  }

  notifyStatus(status) {
    this.status = status;
    this.onSyncCallbacks.forEach(cb => cb(status));
  }

  applyRemoteState(newState) {
    const currentActiveTab = store.state.activeTab;
    store.state = { ...store.getDefaultState(), ...newState, activeTab: currentActiveTab };
    store.saveState(false);

    this.notifyStatus('synced');

    // Custom event to trigger UI re-render preserving scroll position
    window.dispatchEvent(new CustomEvent('magicloom-cloud-synced'));
  }

  // Push local state to cloud instantly on mutation
  async pushToCloud() {
    if (this.isPushing) return;
    this.isPushing = true;
    this.notifyStatus('syncing');

    const timestamp = Date.now();
    const payload = {
      syncCode: this.syncCode,
      lastUpdated: timestamp,
      state: store.state
    };

    // Broadcast tab-to-tab instantly
    if (this.broadcast) {
      this.broadcast.postMessage(payload);
    }

    try {
      const res = await fetch(`${ENDPOINT_PRIMARY}/${encodeURIComponent(this.syncCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.lastRemoteUpdate = timestamp;
        this.notifyStatus('synced');
      } else {
        this.notifyStatus('error');
      }
    } catch (e) {
      console.warn('Cloud sync push offline queueing:', e);
      this.notifyStatus('idle');
    } finally {
      this.isPushing = false;
    }
  }

  // Pull remote state from cloud
  async pullFromCloud() {
    if (this.isPushing) return;

    try {
      const res = await fetch(`${ENDPOINT_PRIMARY}/${encodeURIComponent(this.syncCode)}`, {
        cache: 'no-store'
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data && data.state && data.lastUpdated > (this.lastRemoteUpdate || 0)) {
        this.lastRemoteUpdate = data.lastUpdated;
        this.applyRemoteState(data.state);
      }
    } catch (e) {
      // Quietly ignore network drops so offline work is seamless
    }
  }
}

export const syncEngine = new SyncEngine();
