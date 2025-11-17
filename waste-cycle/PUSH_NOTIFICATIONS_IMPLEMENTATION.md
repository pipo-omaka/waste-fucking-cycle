# 📱 ระบบ Push Notifications - Waste-Cycle

## ✅ สรุปการทำงาน

ระบบ Push Notifications ใช้ Firebase Cloud Messaging (FCM) เพื่อส่งการแจ้งเตือนไปยังผู้ใช้แม้เมื่อเบราว์เซอร์หรือแท็บถูกปิด

---

## 📁 ไฟล์ที่สร้าง/แก้ไข

### Frontend Files (ใหม่)

1. **`client/public/firebase-messaging-sw.js`**
   - Service Worker สำหรับรับ background messages
   - จัดการ notification clicks และเปิดแอป

2. **`client/src/utils/fcmUtils.ts`**
   - Utility functions สำหรับ FCM
   - `getUserLocation()`, `geocodeAddress()`, `openNavigation()`
   - Token registration และ management

3. **`client/src/hooks/useNotifications.ts`**
   - React hook สำหรับจัดการ notifications
   - Auto-initialization เมื่อ user login
   - Permission handling

4. **`client/src/components/NotificationPermissionPrompt.tsx`**
   - Component สำหรับแสดง permission prompt
   - UX สำหรับขอ permission

### Frontend Files (แก้ไข)

5. **`client/src/App.tsx`**
   - เพิ่ม `useNotifications` hook
   - Handle notification clicks และ navigation
   - URL parameter handling (`?roomId=xxx`)

6. **`client/src/components/ChatPage.tsx`**
   - Handle `initialRoomId` prop จาก notification clicks

### Backend Files (ใหม่)

7. **`server/src/services/notificationService.js`**
   - Service สำหรับส่ง push notifications
   - `sendChatNotification()` function
   - Token management

### Backend Files (แก้ไข)

8. **`server/src/config/firebaseConfig.js`**
   - Export `messaging` instance สำหรับ FCM

9. **`server/src/controllers/chatController.js`**
   - ส่ง notifications เมื่อมีข้อความใหม่
   - Get sender name และส่ง notification

---

## 🔧 การตั้งค่า

### 1. Firebase Console - VAPID Key

1. ไปที่ Firebase Console:
   ```
   https://console.firebase.google.com/project/waste-cycle-a6c6e/settings/cloudmessaging
   ```

2. ในส่วน "Web Push certificates":
   - คลิก "Generate key pair" (ถ้ายังไม่มี)
   - Copy **Key pair** (VAPID key)

3. เพิ่มใน `client/.env`:
   ```env
   VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
   ```

### 2. Service Worker Configuration

ไฟล์ `client/public/firebase-messaging-sw.js` ต้องมี Firebase config

**สำหรับ Development**: แก้ไขไฟล์โดยตรง ใส่ config values

**สำหรับ Production**: ใช้ build script เพื่อ inject config

### 3. Icons

สร้างไฟล์ icons ใน `client/public/`:
- `icon-192x192.png` - Main notification icon
- `badge-72x72.png` - Small badge icon

---

## 🚀 Flow การทำงาน

### 1. Initialization (เมื่อ User Login)

```
User Login
  ↓
useNotifications hook detects user
  ↓
Request notification permission
  ↓
Register Service Worker (/firebase-messaging-sw.js)
  ↓
Get FCM Token from Firebase
  ↓
Save Token to Firestore (users/{userId}/fcmToken)
  ↓
Ready to receive notifications
```

### 2. Sending Notification (เมื่อมีข้อความใหม่)

```
User A sends message to User B
  ↓
Backend: postMessage() in chatController.js
  ↓
Save message to Firestore
  ↓
Get User B's FCM token from Firestore
  ↓
Get User A's name (sender name)
  ↓
Call sendChatNotification() from notificationService.js
  ↓
Send notification via Firebase Admin SDK
  ↓
User B receives notification (even if tab is closed)
```

### 3. Receiving Notification

**Foreground (แอปเปิดอยู่)**:
```
Notification received
  ↓
onMessage() handler in useNotifications
  ↓
Show in-app notification
  ↓
Navigate to chat room if clicked
```

**Background (แท็บปิด)**:
```
Notification received
  ↓
Service Worker: onBackgroundMessage()
  ↓
Show system notification
  ↓
User clicks notification
  ↓
Service Worker: notificationclick event
  ↓
Open app with URL: /chat?roomId={chatId}
  ↓
App.tsx reads roomId from URL
  ↓
Navigate to ChatPage with selected room
```

---

## 📝 Code Examples

### Frontend: Request Permission

```typescript
const { requestPermission } = useNotifications();

// Request permission
await requestPermission();
```

### Backend: Send Notification

```javascript
import { sendChatNotification } from '../services/notificationService.js';

// Send notification when message is created
await sendChatNotification(
  receiverId,      // User ID ของผู้รับ
  senderId,        // User ID ของผู้ส่ง
  senderName,      // ชื่อผู้ส่ง
  messageText,     // ข้อความ
  chatRoomId       // Chat room ID
);
```

---

## 🧪 Testing

### 1. ทดสอบ Permission Request

1. Login เข้าระบบ
2. ตรวจสอบว่า permission prompt แสดงขึ้น
3. คลิก "เปิดการแจ้งเตือน"
4. ตรวจสอบว่า permission ถูก granted

### 2. ทดสอบ Foreground Notifications

1. เปิดแอปใน browser
2. ส่งข้อความจาก user อื่น
3. ควรเห็น notification ในแอป

### 3. ทดสอบ Background Notifications

1. เปิดแอปใน browser
2. ปิดแท็บ (หรือ minimize browser)
3. ส่งข้อความจาก user อื่น
4. ควรเห็น notification ในระบบ

### 4. ทดสอบ Notification Clicks

1. คลิกที่ notification
2. ควรเปิดหน้าแชทที่ถูกต้อง

---

## 🔍 Troubleshooting

### ปัญหา: ไม่ได้รับ Notifications

**ตรวจสอบ**:
1. ✅ Notification permission = 'granted'
2. ✅ FCM token ถูกบันทึกใน Firestore
3. ✅ VAPID key ถูกตั้งค่าใน `.env`
4. ✅ Service Worker ถูก register สำเร็จ

**Debug**:
```javascript
// Browser console
console.log('Permission:', Notification.permission);
console.log('Service Worker:', navigator.serviceWorker.controller);

// ตรวจสอบ FCM token ใน Firestore
// users/{userId}/fcmToken
```

### ปัญหา: Service Worker ไม่ทำงาน

**ตรวจสอบ**:
1. ✅ ไฟล์อยู่ใน `/public/firebase-messaging-sw.js`
2. ✅ ถูก serve ที่ root URL
3. ✅ Browser รองรับ Service Workers

**Debug**:
- Chrome DevTools → Application → Service Workers
- ตรวจสอบว่า service worker active

---

## ✅ Checklist

- [ ] VAPID key ถูกตั้งค่าใน `.env`
- [ ] Service Worker file อยู่ใน `/public` directory
- [ ] Icons ถูกสร้างและวางใน `/public` directory
- [ ] Firebase Admin SDK ถูก initialize ถูกต้อง
- [ ] Backend สามารถส่ง notifications ได้
- [ ] Frontend สามารถรับ notifications ได้
- [ ] Notification clicks ทำงานถูกต้อง

---

## 🎉 สรุป

ระบบ Push Notifications พร้อมใช้งานแล้ว! ผู้ใช้จะได้รับการแจ้งเตือนเมื่อมีข้อความใหม่ แม้เมื่อแท็บหรือเบราว์เซอร์ถูกปิด

