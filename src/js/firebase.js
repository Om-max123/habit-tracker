/**
 * Firebase Initialization & Google Authentication Module
 * True Real-Time WebSocket Cloud Synchronization across Laptop & Phone.
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  off 
} from 'firebase/database';

// Dedicated Firebase App Configuration for Realtime WebSockets & Google Auth
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
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Trigger Google Sign-In via Popup (or Redirect fallback on mobile)
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider);
    } else {
      console.warn('Google auth popup error, falling back to redirect:', error);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err) {
        console.error('Google Sign-In failed:', err);
      }
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

  // True Real-Time WebSocket Push Listener from Firebase
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
