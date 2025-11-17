# 🚀 Quick Start: Push Notifications Setup

## ⚡ ขั้นตอนด่วน (5 นาที)

### 1. ตั้งค่า VAPID Key

1. ไปที่ Firebase Console:
   ```
   https://console.firebase.google.com/project/waste-cycle-a6c6e/settings/cloudmessaging
   ```

2. คลิก "Generate key pair" ในส่วน "Web Push certificates"

3. Copy **Key pair** (VAPID key)

4. เพิ่มใน `client/.env`:
   ```env
   VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
   ```

### 2. อัปเดต Service Worker Config

แก้ไขไฟล์ `client/public/firebase-messaging-sw.js`:

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_ACTUAL_API_KEY',        // จาก firebaseConfig.ts
  authDomain: 'waste-cycle-a6c6e.firebaseapp.com',
  projectId: 'waste-cycle-a6c6e',
  storageBucket: 'waste-cycle-a6c6e.appspot.com',
  messagingSenderId: 'YOUR_ACTUAL_SENDER_ID',  // จาก firebaseConfig.ts
  appId: 'YOUR_ACTUAL_APP_ID',          // จาก firebaseConfig.ts
};
```

**หรือ** ดูค่าใน `client/src/firebaseConfig.ts` แล้ว copy มาใส่

### 3. สร้าง Icons (Optional)

สร้างไฟล์ icons ใน `client/public/`:
- `icon-192x192.png` (192x192 pixels)
- `badge-72x72.png` (72x72 pixels)

### 4. Restart Development Server

```bash
cd client
npm run dev
```

### 5. ทดสอบ

1. Login เข้าระบบ
2. อนุญาต notification permission
3. ส่งข้อความจาก user อื่น
4. ควรเห็น notification

---

## ✅ ตรวจสอบว่าใช้งานได้

### Frontend
- ✅ Permission prompt แสดงขึ้นเมื่อ login
- ✅ FCM token ถูกบันทึกใน Firestore (`users/{userId}/fcmToken`)
- ✅ Service Worker ถูก register (ตรวจสอบใน Chrome DevTools → Application → Service Workers)

### Backend
- ✅ Backend logs แสดง "✅ Push notification sent successfully"
- ✅ ไม่มี error เมื่อส่งข้อความ

---

## 🐛 ปัญหาที่พบบ่อย

### "VAPID key is not configured"
→ เพิ่ม `VITE_FIREBASE_VAPID_KEY` ใน `client/.env`

### "Service Worker registration failed"
→ ตรวจสอบว่าไฟล์ `firebase-messaging-sw.js` อยู่ใน `/public` directory

### "No FCM token available"
→ ตรวจสอบว่า notification permission = 'granted'

### ไม่ได้รับ notifications
→ ตรวจสอบ FCM token ใน Firestore และ backend logs

---

## 📚 เอกสารเพิ่มเติม

ดู `PUSH_NOTIFICATIONS_SETUP.md` สำหรับรายละเอียดเพิ่มเติม

