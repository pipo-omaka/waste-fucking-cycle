/**
 * Firebase Cloud Messaging Service Worker
 * 
 * This service worker handles background push notifications
 * even when the browser tab is closed.
 * 
 * IMPORTANT: This file must be in the /public directory
 * and will be served at the root URL (/firebase-messaging-sw.js)
 * 
 * CRITICAL: This file uses ONLY compat syntax (no TypeScript, no ESM)
 */

// Import Firebase scripts (compat version)
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

// Firebase configuration
// IMPORTANT: Update these values to match your firebaseConfig.ts
// For production, use a build script to inject values from environment variables
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY_HERE', // Replace with your Firebase API Key
  authDomain: 'waste-cycle-a6c6e.firebaseapp.com',
  projectId: 'waste-cycle-a6c6e',
  storageBucket: 'waste-cycle-a6c6e.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID_HERE', // Replace with your Messaging Sender ID
  appId: 'YOUR_APP_ID_HERE', // Replace with your App ID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

/**
 * Handle background messages (when app is closed)
 * This is called when a push notification is received
 * and the app is not in the foreground
 */
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  var notificationTitle = payload.notification && payload.notification.title 
    ? payload.notification.title 
    : 'Waste-Cycle Chat';
  
  var notificationOptions = {
    body: payload.notification && payload.notification.body 
      ? payload.notification.body 
      : 'คุณได้รับข้อความใหม่',
    icon: payload.notification && payload.notification.icon 
      ? payload.notification.icon 
      : '/icon-192x192.png',
    badge: '/badge-72x72.png',
    image: payload.notification && payload.notification.image 
      ? payload.notification.image 
      : undefined,
    data: {
      chatId: payload.data && payload.data.chatId ? payload.data.chatId : '',
      senderId: payload.data && payload.data.senderId ? payload.data.senderId : '',
      senderName: payload.data && payload.data.senderName ? payload.data.senderName : '',
      click_action: payload.data && payload.data.click_action ? payload.data.click_action : '/chat',
    },
    tag: payload.data && payload.data.chatId ? payload.data.chatId : 'chat-notification',
    requireInteraction: false,
    silent: false,
  };

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click
 * When user clicks on a notification, open the app to the chat page
 */
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  var notificationData = event.notification.data || {};
  var chatId = notificationData.chatId || '';
  var clickAction = notificationData.click_action || '/chat';

  // Build the URL to open
  var urlToOpen = clickAction;
  if (chatId) {
    urlToOpen = clickAction + '?roomId=' + chatId;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window/tab open with the target URL
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && client.url.indexOf(clickAction) !== -1 && 'focus' in client) {
          // If a window is already open, focus it
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Handle push events (for custom push handling if needed)
 */
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push event received:', event);

  // If the push event has data, parse it
  var data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  var notificationTitle = data.title || 'Waste-Cycle';
  var notificationOptions = {
    body: data.body || 'คุณได้รับข้อความใหม่',
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data,
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});
