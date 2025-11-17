/**
 * Migration Script: Fix Chat Participants Array
 * 
 * This script scans all chatRooms in Firestore and:
 * 1. Detects any participant entries that look like JWT tokens
 * 2. Uses Firebase Admin verifyIdToken() to decode token → get uid
 * 3. Replaces the token with proper UID
 * 4. Removes duplicate UIDs
 * 
 * Usage:
 *   node scripts/fix-chat-participants.js
 * 
 * IMPORTANT: Backup your Firestore before running this script!
 */

import { db, auth } from '../src/config/firebaseConfig.js';

/**
 * Validate that a string is a valid Firebase UID (not a JWT token)
 */
const isValidUid = (uid) => {
  if (!uid || typeof uid !== 'string') {
    return false;
  }
  
  const uidStr = String(uid).trim();
  
  // Firebase UIDs are typically 28 characters (can be 20-30)
  // JWT tokens are typically 800+ characters
  if (uidStr.length > 100) {
    return false;
  }
  
  // Firebase UIDs are alphanumeric (and some special chars)
  // JWT tokens contain dots (.)
  if (uidStr.includes('.')) {
    return false;
  }
  
  return true;
};

/**
 * Decode JWT token to get UID (if it's a valid Firebase ID token)
 */
const decodeTokenToUid = async (token) => {
  try {
    if (!token || typeof token !== 'string' || token.length < 100) {
      return null; // Not a JWT token
    }
    
    // Try to verify and decode the token
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
};

/**
 * Clean participants array to remove JWT tokens and keep only valid UIDs
 */
const cleanParticipantsArray = async (participants) => {
  if (!Array.isArray(participants)) {
    return [];
  }
  
  const cleaned = [];
  const seen = new Set();
  
  for (const participant of participants) {
    const participantStr = String(participant).trim();
    
    // Skip empty strings
    if (!participantStr) {
      continue;
    }
    
    // If it's a valid UID, add it
    if (isValidUid(participantStr)) {
      if (!seen.has(participantStr)) {
        cleaned.push(participantStr);
        seen.add(participantStr);
      }
      continue;
    }
    
    // If it looks like a JWT token, try to decode it
    if (participantStr.length > 100 || participantStr.includes('.')) {
      console.log(`  🔍 Attempting to decode JWT token: ${participantStr.substring(0, 20)}...`);
      const decodedUid = await decodeTokenToUid(participantStr);
      
      if (decodedUid && !seen.has(decodedUid)) {
        cleaned.push(decodedUid);
        seen.add(decodedUid);
        console.log(`  ✅ Decoded to UID: ${decodedUid}`);
      } else {
        console.log(`  ⚠️  Failed to decode token (invalid or expired)`);
      }
    }
  }
  
  return cleaned;
};

/**
 * Main migration function
 */
const fixChatParticipants = async () => {
  console.log('🚀 Starting chat participants migration...\n');
  
  try {
    // Get all chat rooms
    const chatRoomsSnapshot = await db.collection('chatRooms').get();
    
    if (chatRoomsSnapshot.empty) {
      console.log('✅ No chat rooms found. Nothing to migrate.');
      return;
    }
    
    console.log(`📊 Found ${chatRoomsSnapshot.size} chat rooms\n`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Process each chat room
    for (const doc of chatRoomsSnapshot.docs) {
      const roomId = doc.id;
      const data = doc.data();
      const originalParticipants = Array.isArray(data.participants) 
        ? data.participants.map(p => String(p)) 
        : [];
      
      // Check if participants array needs fixing
      const hasJwtTokens = originalParticipants.some(p => !isValidUid(String(p)));
      
      if (!hasJwtTokens && originalParticipants.length > 0) {
        // Already clean, skip
        continue;
      }
      
      console.log(`\n📝 Processing room: ${roomId}`);
      console.log(`   Original participants: ${JSON.stringify(originalParticipants)}`);
      
      try {
        // Clean participants array
        const cleanedParticipants = await cleanParticipantsArray(originalParticipants);
        
        console.log(`   Cleaned participants: ${JSON.stringify(cleanedParticipants)}`);
        
        // Update if changed
        if (JSON.stringify(cleanedParticipants.sort()) !== JSON.stringify(originalParticipants.sort())) {
          await doc.ref.update({
            participants: cleanedParticipants,
          });
          
          fixedCount++;
          console.log(`   ✅ Fixed!`);
        } else {
          console.log(`   ℹ️  No changes needed`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error processing room ${roomId}:`, error.message);
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Fixed: ${fixedCount} rooms`);
    console.log(`   Errors: ${errorCount} rooms`);
    console.log(`   Total: ${chatRoomsSnapshot.size} rooms`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
fixChatParticipants()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

