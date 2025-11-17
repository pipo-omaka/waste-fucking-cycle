/**
 * Firebase Cloud Messaging (FCM) Notification Service
 * 
 * Handles sending push notifications to users via FCM
 */

import { messaging } from '../config/firebaseConfig.js';
import { db } from '../config/firebaseConfig.js';

/**
 * Get FCM token for a user from Firestore
 * @param {string} userId - User ID (Firebase UID)
 * @returns {Promise<string|null>} - FCM token or null if not found
 */
const getUserFCMToken = async (userId) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`⚠️  User ${userId} not found in Firestore`);
      return null;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      console.log(`⚠️  User ${userId} does not have an FCM token`);
      return null;
    }

    return fcmToken;
  } catch (error) {
    console.error(`❌ Error getting FCM token for user ${userId}:`, error);
    return null;
  }
};

/**
 * Send push notification to a user
 * @param {string} userId - User ID (Firebase UID) to send notification to
 * @param {Object} notificationData - Notification payload
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body/message
 * @param {string} notificationData.icon - Notification icon URL (optional)
 * @param {string} notificationData.image - Notification image URL (optional)
 * @param {Object} notificationData.data - Custom data to pass to the app
 * @returns {Promise<boolean>} - true if sent successfully, false otherwise
 */
export const sendPushNotification = async (userId, notificationData) => {
  try {
    // Get user's FCM token
    const fcmToken = await getUserFCMToken(userId);

    if (!fcmToken) {
      console.log(`⚠️  Cannot send notification to user ${userId}: No FCM token`);
      return false;
    }

    // Build the message payload
    const message = {
      token: fcmToken,
      notification: {
        title: notificationData.title || 'Waste-Cycle Chat',
        body: notificationData.body || 'คุณได้รับข้อความใหม่',
        icon: notificationData.icon || '/icon-192x192.png',
        image: notificationData.image || undefined,
      },
      data: {
        // Custom data that will be available in the notification click handler
        chatId: notificationData.data?.chatId || '',
        senderId: notificationData.data?.senderId || '',
        senderName: notificationData.data?.senderName || '',
        click_action: notificationData.data?.click_action || '/chat',
        type: notificationData.data?.type || 'chat',
      },
      webpush: {
        fcmOptions: {
          link: notificationData.data?.click_action || '/chat',
        },
        notification: {
          requireInteraction: false,
          silent: false,
          tag: notificationData.data?.chatId || 'chat-notification', // Group notifications by chat
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'chat_messages',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send the notification
    const response = await messaging.send(message);
    console.log(`✅ Push notification sent successfully to user ${userId}:`, response);
    return true;
  } catch (error) {
    console.error(`❌ Error sending push notification to user ${userId}:`, error);
    
    // Handle specific FCM errors
    if (error.code === 'messaging/registration-token-not-registered') {
      console.log(`⚠️  FCM token for user ${userId} is no longer valid, removing from Firestore`);
      // Optionally remove the invalid token from Firestore
      try {
        await db.collection('users').doc(userId).update({
          fcmToken: null,
          fcmTokenUpdatedAt: null,
        });
      } catch (updateError) {
        console.error('Failed to remove invalid FCM token:', updateError);
      }
    }
    
    return false;
  }
};

/**
 * Send chat message notification
 * Convenience function specifically for chat messages
 * @param {string} receiverId - User ID of the message receiver
 * @param {string} senderId - User ID of the message sender
 * @param {string} senderName - Name of the message sender
 * @param {string} messageText - Message text (will be truncated if too long)
 * @param {string} chatRoomId - Chat room ID
 * @returns {Promise<boolean>} - true if sent successfully, false otherwise
 */
export const sendChatNotification = async (
  receiverId,
  senderId,
  senderName,
  messageText,
  chatRoomId
) => {
  // Truncate message if too long (notification body should be short)
  const maxLength = 100;
  const truncatedMessage = messageText.length > maxLength
    ? messageText.substring(0, maxLength) + '...'
    : messageText;

  return await sendPushNotification(receiverId, {
    title: senderName || 'Waste-Cycle Chat',
    body: truncatedMessage,
    icon: '/icon-192x192.png',
    data: {
      chatId: chatRoomId,
      senderId: senderId,
      senderName: senderName,
      click_action: `/chat?roomId=${chatRoomId}`,
      type: 'chat',
    },
  });
};

/**
 * Send notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {Object} notificationData - Notification payload
 * @returns {Promise<{success: number, failed: number}>} - Count of successful and failed sends
 */
export const sendBulkNotifications = async (userIds, notificationData) => {
  const results = {
    success: 0,
    failed: 0,
  };

  // Send notifications in parallel (but limit concurrency to avoid overwhelming FCM)
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const promises = batch.map(userId =>
      sendPushNotification(userId, notificationData)
        .then(success => {
          if (success) {
            results.success++;
          } else {
            results.failed++;
          }
        })
        .catch(() => {
          results.failed++;
        })
    );

    await Promise.all(promises);
  }

  return results;
};

