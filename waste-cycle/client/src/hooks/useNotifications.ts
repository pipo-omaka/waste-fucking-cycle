/**
 * React Hook for managing Push Notifications
 * 
 * This hook handles:
 * - FCM initialization
 * - Token registration
 * - Permission requests
 * - Foreground message handling
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import {
  setupFCM,
  initializeFCM,
  setupForegroundMessageHandler,
  removeFCMTokenFromFirestore,
  isNotificationSupported,
  requestNotificationPermission,
} from '../utils/fcmUtils';
import type { Messaging } from 'firebase/messaging';

interface UseNotificationsReturn {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isInitialized: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
}

/**
 * Hook for managing push notifications
 * @param onNotificationReceived - Callback when a notification is received in foreground
 */
export const useNotifications = (
  onNotificationReceived?: (payload: any) => void
): UseNotificationsReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState<Messaging | null>(null);

  // Check if notifications are supported
  useEffect(() => {
    const supported = isNotificationSupported();
    setIsSupported(supported);

    // Check current permission status
    if (supported) {
      setIsPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      setError(null);
      const permission = await requestNotificationPermission();
      setIsPermissionGranted(permission === 'granted');

      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request notification permission');
      console.error('❌ Permission request failed:', err);
    }
  }, []);

  // Initialize FCM for the current user
  const initialize = useCallback(async () => {
    try {
      setError(null);

      if (!isSupported) {
        throw new Error('Notifications are not supported in this browser');
      }

      // Wait for auth state
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        // Wait for user to be available
        return new Promise<void>((resolve, reject) => {
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (user) {
              try {
                await setupFCM(user.uid);
                setIsInitialized(true);
                resolve();
              } catch (err: any) {
                setError(err.message || 'Failed to initialize FCM');
                reject(err);
              }
            } else {
              reject(new Error('User not authenticated'));
            }
          });
        });
      }

      // Initialize FCM
      await setupFCM(currentUser.uid);

      // Set up foreground message handler
      const messagingInstance = await initializeFCM();
      setMessaging(messagingInstance);

      if (onNotificationReceived) {
        setupForegroundMessageHandler(messagingInstance, onNotificationReceived);
      }

      setIsInitialized(true);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize notifications');
      console.error('❌ FCM initialization failed:', err);
    }
  }, [isSupported, onNotificationReceived]);

  // Cleanup: Remove FCM token when user logs out
  const cleanup = useCallback(async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        await removeFCMTokenFromFirestore(currentUser.uid);
      }

      setMessaging(null);
      setIsInitialized(false);
    } catch (err: any) {
      console.error('❌ FCM cleanup failed:', err);
      // Don't set error - cleanup failures are not critical
    }
  }, []);

  // Auto-initialize when user is authenticated
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && isSupported && Notification.permission === 'granted') {
        try {
          await initialize();
        } catch (err) {
          console.error('Auto-initialization failed:', err);
        }
      } else if (!user) {
        await cleanup();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isSupported, initialize, cleanup]);

  return {
    isSupported,
    isPermissionGranted,
    isInitialized,
    error,
    requestPermission,
    initialize,
    cleanup,
  };
};

