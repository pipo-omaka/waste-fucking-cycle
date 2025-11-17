# คู่มือการตั้งค่า Push Notifications สำหรับ Waste-Cycle

## 📋 สรุป

ระบบ Push Notifications ใช้ Firebase Cloud Messaging (FCM) เพื่อส่งการแจ้งเตือนไปยังผู้ใช้แม้เมื่อเบราว์เซอร์หรือแท็บถูกปิด

---

## 🎯 ฟีเจอร์

- ✅ **Background Notifications**: รับการแจ้งเตือนแม้เมื่อแท็บถูกปิด
- ✅ **Foreground Notifications**: แสดงการแจ้งเตือนเมื่อแอปเปิดอยู่
- ✅ **Click Actions**: คลิกการแจ้งเตือนเพื่อเปิดหน้าแชทที่ถูกต้อง
- ✅ **Auto Token Management**: บันทึกและอัปเดต FCM token อัตโนมัติ
- ✅ **Permission Handling**: จัดการ permission requests และแสดง prompts

---

## 📁 ไฟล์ที่สร้าง/แก้ไข

### Frontend Files

1. **`client/public/firebase-messaging-sw.js`** (ใหม่)
   - Service Worker สำหรับรับ background messages
   - จัดการ notification clicks

2. **`client/src/utils/fcmUtils.ts`** (ใหม่)
   - Utility functions สำหรับ FCM
   - Token registration และ management

3. **`client/src/hooks/useNotifications.ts`** (ใหม่)
   - React hook สำหรับจัดการ notifications
   - Auto-initialization เมื่อ user login

4. **`client/src/components/NotificationPermissionPrompt.tsx`** (ใหม่)
   - Component สำหรับแสดง permission prompt

5. **`client/src/App.tsx`** (แก้ไข)
   - เพิ่ม useNotifications hook
   - Handle notification clicks และ navigation

### Backend Files

1. **`server/src/services/notificationService.js`** (ใหม่)
   - Service สำหรับส่ง push notifications
   - `sendChatNotification()` function

2. **`server/src/config/firebaseConfig.js`** (แก้ไข)
   - Export `messaging` instance

3. **`server/src/controllers/chatController.js`** (แก้ไข)
   - ส่ง notifications เมื่อมีข้อความใหม่

---

## 🔧 การตั้งค่า

### 1. Firebase Console Setup

#### A. สร้าง Web Push Certificate (VAPID Key)

1. ไปที่ Firebase Console:
   ```
   https://console.firebase.google.com/project/waste-cycle-a6c6e/settings/cloudmessaging
   ```

2. ในส่วน "Web Push certificates":
   - คลิก "Generate key pair" (ถ้ายังไม่มี)
   - Copy **Key pair** (VAPID key)

3. เพิ่ม VAPID key ใน `.env`:
   ```env
   VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
   ```

#### B. ตรวจสอบ Service Account

- ตรวจสอบว่า `serviceAccountKey.json` มีอยู่และถูกต้อง
- Backend ใช้ Firebase Admin SDK เพื่อส่ง notifications

### 2. Frontend Environment Variables

สร้างหรืออัปเดต `client/.env`:

```env
# Firebase Config (existing)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=waste-cycle-a6c6e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=waste-cycle-a6c6e
VITE_FIREBASE_STORAGE_BUCKET=waste-cycle-a6c6e.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# FCM VAPID Key (NEW - required for push notifications)
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### 3. Service Worker Configuration

ไฟล์ `client/public/firebase-messaging-sw.js` ต้องมี Firebase config ที่ถูกต้อง

**⚠️ หมายเหตุ**: Service Worker ใช้ hardcoded config หรือต้องใช้ build script เพื่อ inject config

**Option 1: Manual Configuration** (สำหรับ development)
- แก้ไขไฟล์ `firebase-messaging-sw.js` โดยตรง
- ใส่ Firebase config values

**Option 2: Build Script** (แนะนำสำหรับ production)
- สร้าง build script ที่ inject config จาก environment variables

### 4. Icons สำหรับ Notifications

สร้างไฟล์ icons ใน `client/public/`:
- `icon-192x192.png` - Main notification icon
- `badge-72x72.png` - Small badge icon

---

## 🚀 การใช้งาน

### สำหรับผู้ใช้

1. **เปิดการแจ้งเตือน**:
   - เมื่อ login → ระบบจะขอ permission อัตโนมัติ
   - หรือคลิกปุ่ม "เปิดการแจ้งเตือน" ในหน้า Chat

2. **รับการแจ้งเตือน**:
   - เมื่อมีข้อความใหม่ → รับการแจ้งเตือนแม้เมื่อแท็บถูกปิด
   - คลิกการแจ้งเตือน → เปิดหน้าแชทที่ถูกต้อง

### สำหรับ Developer

#### Testing Notifications

1. **ทดสอบ Foreground Notifications**:
   - เปิดแอปใน browser
   - ส่งข้อความจาก user อื่น
   - ควรเห็น notification ในแอป

2. **ทดสอบ Background Notifications**:
   - เปิดแอปใน browser
   - ปิดแท็บ (หรือ minimize browser)
   - ส่งข้อความจาก user อื่น
   - ควรเห็น notification ในระบบ

3. **ทดสอบ Notification Clicks**:
   - คลิกที่ notification
   - ควรเปิดหน้าแชทที่ถูกต้อง

---

## 🔍 Troubleshooting

### ปัญหา: ไม่ได้รับ Notifications

**ตรวจสอบ**:
1. ✅ Notification permission ถูก granted หรือไม่
2. ✅ FCM token ถูกบันทึกใน Firestore หรือไม่
3. ✅ VAPID key ถูกตั้งค่าถูกต้องหรือไม่
4. ✅ Service Worker ถูก register สำเร็จหรือไม่

**Debug Steps**:
```javascript
// ใน browser console
console.log('Notification permission:', Notification.permission);
console.log('Service Worker:', navigator.serviceWorker.controller);

// ตรวจสอบ FCM token ใน Firestore
// users/{userId}/fcmToken
```

### ปัญหา: Service Worker ไม่ทำงาน

**ตรวจสอบ**:
1. ✅ ไฟล์ `firebase-messaging-sw.js` อยู่ใน `/public` directory
2. ✅ Service Worker ถูก serve ที่ root URL (`/firebase-messaging-sw.js`)
3. ✅ Browser รองรับ Service Workers (Chrome, Firefox, Edge)

**Debug Steps**:
- เปิด Chrome DevTools → Application → Service Workers
- ตรวจสอบว่า service worker ถูก register และ active

### ปัญหา: Backend ไม่สามารถส่ง Notifications

**ตรวจสอบ**:
1. ✅ Firebase Admin SDK ถูก initialize ถูกต้อง
2. ✅ `messaging` instance ถูก export จาก `firebaseConfig.js`
3. ✅ Service Account มี permission สำหรับ FCM

**Debug Steps**:
- ตรวจสอบ backend logs สำหรับ error messages
- ทดสอบ `sendChatNotification()` function โดยตรง

---

## 📝 Code Flow

### 1. Initialization Flow

```
User Login
  ↓
useNotifications hook detects user
  ↓
Request notification permission
  ↓
Register Service Worker
  ↓
Get FCM Token
  ↓
Save Token to Firestore (users/{userId}/fcmToken)
```

### 2. Message Sending Flow

```
User A sends message to User B
  ↓
Backend: postMessage() in chatController.js
  ↓
Save message to Firestore
  ↓
Get User B's FCM token from Firestore
  ↓
Send notification via FCM
  ↓
User B receives notification (even if tab is closed)
```

### 3. Notification Click Flow

```
User clicks notification
  ↓
Service Worker: notificationclick event
  ↓
Open app with URL: /chat?roomId={chatId}
  ↓
App.tsx: Read roomId from URL
  ↓
Navigate to ChatPage with selected room
```

---

## 🔐 Security Notes

1. **FCM Tokens**: เก็บใน Firestore ภายใต้ user document
2. **Permission**: User ต้อง grant permission เอง
3. **Token Validation**: Backend ตรวจสอบว่า user มี token ก่อนส่ง
4. **Error Handling**: Notification failures ไม่ทำให้ message sending ล้มเหลว

---

## 📚 Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

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

