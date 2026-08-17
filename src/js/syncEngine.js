/**
 * MagicLoom Real-Time Cross-Device Cloud Sync Engine
 * Synchronizes data across Phone & Laptop in real-time.
 */

import { store } from './store.js';

const SYNC_CODE_KEY = 'magicloom_personal_sync_code';
const DEFAULT_SYNC_CODE = 'Om-max123-habits';

// Endpoint using reliable JSON cloud store for instant cross-device sync
const CLOUD_SYNC_ENDPOINT = 'https://api.jsonbin.io/v3/b';
const PUBLIC_SYNC_STORAGE = 'https://kvdb.io/7zR1n8x2FqL9mP3k5Y6w';

class SyncEngine {
  constructor() {
    this.syncCode = this.loadSyncCode();
    this.status = 'idle'; // 'idle', 'syncing', 'synced', 'error'
    this.lastRemoteUpdate = 0;
    this.onSyncCallbacks = [];

    // Auto-poll cloud every 3 seconds for live phone <-> laptop updates
    setInterval(() => this.pullFromCloud(), 3000);

    // Sync when tab regains visibility (e.g. unlocking phone or switching windows)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.pullFromCloud();
      }
    });
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

  // Push local state to cloud
  async pushToCloud() {
    try {
      this.notifyStatus('syncing');
      const payload = {
        syncCode: this.syncCode,
        lastUpdated: Date.now(),
        state: store.state
      };

      const res = await fetch(`${PUBLIC_SYNC_STORAGE}/${encodeURIComponent(this.syncCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.lastRemoteUpdate = payload.lastUpdated;
        this.notifyStatus('synced');
      } else {
        this.notifyStatus('error');
      }
    } catch (e) {
      console.warn('Cloud sync push failed (working offline):', e);
      this.notifyStatus('idle');
    }
  }

  // Pull remote state from cloud
  async pullFromCloud() {
    try {
      const res = await fetch(`${PUBLIC_SYNC_STORAGE}/${encodeURIComponent(this.syncCode)}`);
      if (!res.ok) return;

      const data = await res.json();
      if (data && data.state && data.lastUpdated > (this.lastRemoteUpdate || 0)) {
        this.lastRemoteUpdate = data.lastUpdated;
        
        // Merge remote state into local store if newer
        const currentActiveTab = store.state.activeTab;
        store.state = { ...store.getDefaultState(), ...data.state, activeTab: currentActiveTab };
        store.saveState();

        this.notifyStatus('synced');

        // Dispatch window event so active view re-renders live
        window.dispatchEvent(new CustomEvent('magicloom-cloud-synced'));
      }
    } catch (e) {
      // Quietly ignore network failures so offline work is seamless
    }
  }
}

export const syncEngine = new SyncEngine();
