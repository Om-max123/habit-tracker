/**
 * MagicLoom Real-Time Cross-Device Cloud Sync Engine
 * True Real-Time WebSocket Synchronization via Google Auth & Firebase Realtime DB.
 */

import { store } from './store.js';
import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeAuthState, 
  subscribeToUserHabits, 
  pushUserHabitsToCloud 
} from './firebase.js';

const SYNC_CODE_KEY = 'magicloom_personal_sync_code';
const DEFAULT_SYNC_CODE = 'Om-max123-habits';
const PUBLIC_SYNC_STORAGE = 'https://kvdb.io/7zR1n8x2FqL9mP3k5Y6w';

class SyncEngine {
  constructor() {
    this.syncCode = this.loadSyncCode();
    this.status = 'idle'; // 'idle', 'syncing', 'synced', 'error'
    this.lastRemoteUpdate = 0;
    this.onSyncCallbacks = [];
    this.currentUser = null;
    this.firebaseUnsubscribe = null;
    this.isPushing = false;

    // Cross-tab broadcast channel for zero-latency local window sync
    if ('BroadcastChannel' in window) {
      this.broadcast = new BroadcastChannel('magicloom_tab_sync');
      this.broadcast.onmessage = (e) => {
        if (e.data && e.data.state && e.data.lastUpdated > (this.lastRemoteUpdate || 0)) {
          this.lastRemoteUpdate = e.data.lastUpdated;
          this.applyRemoteState(e.data.state);
        }
      };
    }

    // Subscribe to Google Auth State Changes
    subscribeAuthState((user) => {
      this.currentUser = user;
      
      // Clean up previous subscription
      if (this.firebaseUnsubscribe) {
        this.firebaseUnsubscribe();
        this.firebaseUnsubscribe = null;
      }

      if (user) {
        this.notifyStatus('synced');
        
        // Connect TRUE WebSocket Real-Time Listener bound to Google User ID
        this.firebaseUnsubscribe = subscribeToUserHabits(user.uid, (remoteData) => {
          if (remoteData && remoteData.state && remoteData.lastUpdated > (this.lastRemoteUpdate || 0)) {
            this.lastRemoteUpdate = remoteData.lastUpdated;
            this.applyRemoteState(remoteData.state);
          }
        });

        // Initial push of current state to ensure cloud has latest data
        this.pushToCloud();
      } else {
        // Fallback polling for unauthenticated users
        this.startFallbackPolling();
      }

      window.dispatchEvent(new CustomEvent('magicloom-auth-changed', { detail: user }));
    });
  }

  startFallbackPolling() {
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        if (!this.currentUser) this.pullFromCloud();
      }, 1500);
    }
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

  async loginWithGoogle() {
    return await loginWithGoogle();
  }

  async logout() {
    return await logoutUser();
  }

  getUser() {
    return this.currentUser;
  }

  applyRemoteState(newState) {
    const currentActiveTab = store.state.activeTab;
    store.state = { ...store.getDefaultState(), ...newState, activeTab: currentActiveTab };
    store.saveState(false);

    this.notifyStatus('synced');

    // Trigger UI re-render preserving exact scroll position
    window.dispatchEvent(new CustomEvent('magicloom-cloud-synced'));
  }

  // Push local state to cloud (Firebase WebSocket push if logged in)
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

    // Local tab broadcast
    if (this.broadcast) {
      this.broadcast.postMessage(payload);
    }

    try {
      if (this.currentUser) {
        // True Real-Time Push to Firebase Realtime Database
        await pushUserHabitsToCloud(this.currentUser.uid, store.state);
        this.lastRemoteUpdate = timestamp;
        this.notifyStatus('synced');
      } else {
        // Fallback HTTP REST push
        const res = await fetch(`${PUBLIC_SYNC_STORAGE}/${encodeURIComponent(this.syncCode)}`, {
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
      }
    } catch (e) {
      console.warn('Cloud sync push offline queueing:', e);
      this.notifyStatus('idle');
    } finally {
      this.isPushing = false;
    }
  }

  async pullFromCloud() {
    if (this.isPushing || this.currentUser) return;

    try {
      const res = await fetch(`${PUBLIC_SYNC_STORAGE}/${encodeURIComponent(this.syncCode)}`, {
        cache: 'no-store'
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data && data.state && data.lastUpdated > (this.lastRemoteUpdate || 0)) {
        this.lastRemoteUpdate = data.lastUpdated;
        this.applyRemoteState(data.state);
      }
    } catch (e) {
      // Quietly handle offline drops
    }
  }
}

export const syncEngine = new SyncEngine();
