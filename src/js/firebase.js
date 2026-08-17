/**
 * Firebase Initialization & Google Authentication Module
 * Lifetime Auth Session Persistence & OAuth Redirect Handler.
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  off 
} from 'firebase/database';

// Firebase Project Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-MagicLoomHabitTrackerKey2026",
  authDomain: "magicloom-habits.firebaseapp.com",
  databaseURL: "https://magicloom-habits-default-rtdb.firebaseio.com",
  projectId: "magicloom-habits",
  storageBucket: "magicloom-habits.appspot.com",
  messagingSenderId: "987654321012",
  appId: "1:987654321012:web:magicloomhabitstracker"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Enforce lifetime LocalStorage session persistence (like real-world apps)
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn('Firebase auth persistence setup notice:', err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Check for pending redirect result on boot
getRedirectResult(auth).then(result => {
  if (result && result.user) {
    console.log('Google Sign-In redirect successful:', result.user.email);
  }
}).catch(err => {
  console.warn('Google Auth redirect result notice:', err);
});

/**
 * Trigger Google Sign-In via Popup with instant Redirect fallback
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.warn('Popup login notice, switching to Google Redirect:', error);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (redirectErr) {
      console.error('Google Sign-In failed:', redirectErr);
      alert('Sign-In Error: Please allow popups or redirects in your browser.');
    }
  }
}

/**
 * Sign Out active Google Account
 */
export async function logoutUser() {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.error('Logout error:', e);
  }
}

/**
 * Listen for Auth state changes
 */
export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Real-Time WebSocket Subscription to Firebase Database for User ID
 */
export function subscribeToUserHabits(userId, onDataReceived) {
  if (!userId) return () => {};
  const userHabitsRef = ref(database, `users/${userId}/habitTracker`);

  onValue(userHabitsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      onDataReceived(data);
    }
  }, (err) => {
    console.warn('Firebase realtime subscription notice:', err);
  });

  return () => off(userHabitsRef);
}

/**
 * Save user habit state to Firebase Realtime Cloud Database
 */
export async function pushUserHabitsToCloud(userId, statePayload) {
  if (!userId) return;
  try {
    const userHabitsRef = ref(database, `users/${userId}/habitTracker`);
    await set(userHabitsRef, {
      state: statePayload,
      lastUpdated: Date.now()
    });
  } catch (e) {
    console.warn('Firebase realtime push error:', e);
  }
}
