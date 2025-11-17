/**
 * Firebase Cloud Messaging (FCM) Utilities
 * 
 * Handles FCM token registration, permission requests, and notification setup
 */

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import app from '../firebaseConfig';

// VAPID key for web push notifications
// Get this from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Check if browser supports notifications
 */
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Request notification permission from user
 * @returns Promise<NotificationPermission> - 'granted', 'denied', or 'default'
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission was previously denied');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Register service worker for FCM
 * @returns Promise<ServiceWorkerRegistration>
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser');
  }

  try {
    // Register the service worker
    // The service worker file should be at the root: /firebase-messaging-sw.js
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    console.log('✅ Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    throw error;
  }
};

/**
 * Get FCM token for the current user
 * @param messaging - Firebase Messaging instance
 * @returns Promise<string> - FCM token
 */
export const getFCMToken = async (messaging: Messaging): Promise<string> => {
  try {
    // Check if VAPID key is configured
    if (!VAPID_KEY) {
      throw new Error('VAPID key is not configured. Please set VITE_FIREBASE_VAPID_KEY in .env');
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (!token) {
      throw new Error('No FCM token available. Make sure notification permission is granted.');
    }

    console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
    return token;
  } catch (error) {
    console.error('❌ Failed to get FCM token:', error);
    throw error;
  }
};

/**
 * Save FCM token to Firestore
 * @param userId - User ID (Firebase UID)
 * @param token - FCM token
 */
export const saveFCMTokenToFirestore = async (userId: string, token: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Get existing user data
    const userDoc = await getDoc(userRef);
    const existingData = userDoc.exists() ? userDoc.data() : {};

    // Update user document with FCM token
    await setDoc(
      userRef,
      {
        ...existingData,
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log('✅ FCM token saved to Firestore for user:', userId);
  } catch (error) {
    console.error('❌ Failed to save FCM token to Firestore:', error);
    throw error;
  }
};

/**
 * Remove FCM token from Firestore (when user logs out)
 * @param userId - User ID (Firebase UID)
 */
export const removeFCMTokenFromFirestore = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Get existing user data
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return; // User doesn't exist, nothing to remove
    }

    const existingData = userDoc.data();

    // Remove FCM token
    await setDoc(
      userRef,
      {
        ...existingData,
        fcmToken: null,
        fcmTokenUpdatedAt: null,
      },
      { merge: true }
    );

    console.log('✅ FCM token removed from Firestore for user:', userId);
  } catch (error) {
    console.error('❌ Failed to remove FCM token from Firestore:', error);
    // Don't throw - this is not critical
  }
};

/**
 * Initialize FCM and get messaging instance
 * @returns Promise<Messaging> - Firebase Messaging instance
 */
export const initializeFCM = async (): Promise<Messaging> => {
  try {
    const messaging = getMessaging(app);
    console.log('✅ FCM initialized');
    return messaging;
  } catch (error) {
    console.error('❌ Failed to initialize FCM:', error);
    throw error;
  }
};

/**
 * Set up foreground message handler
 * This handles notifications when the app is in the foreground
 * @param messaging - Firebase Messaging instance
 * @param onMessageCallback - Callback function to handle messages
 */
export const setupForegroundMessageHandler = (
  messaging: Messaging,
  onMessageCallback: (payload: any) => void
): void => {
  onMessage(messaging, (payload) => {
    console.log('📨 Foreground message received:', payload);
    onMessageCallback(payload);
  });
};

/**
 * Complete FCM setup: register service worker, request permission, get token, save to Firestore
 * @param userId - User ID (Firebase UID)
 * @returns Promise<string> - FCM token
 */
export const setupFCM = async (userId: string): Promise<string> => {
  try {
    // 1. Check if notifications are supported
    if (!isNotificationSupported()) {
      throw new Error('Notifications are not supported in this browser');
    }

    // 2. Register service worker
    await registerServiceWorker();

    // 3. Request notification permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted');
    }

    // 4. Initialize FCM
    const messaging = await initializeFCM();

    // 5. Get FCM token
    const token = await getFCMToken(messaging);

    // 6. Save token to Firestore
    await saveFCMTokenToFirestore(userId, token);

    return token;
  } catch (error) {
    console.error('❌ FCM setup failed:', error);
    throw error;
  }
};

