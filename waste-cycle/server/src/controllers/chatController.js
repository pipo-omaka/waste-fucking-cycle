import asyncHandler from '../middleware/asyncHandler.js';
import { db, auth } from '../config/firebaseConfig.js';
import crypto from 'crypto';
import { sendPushNotification } from '../services/notificationService.js';

/**
 * Validate that a string is a valid Firebase UID (not a JWT token)
 * Firebase UIDs are typically 28 characters long
 * JWT tokens are typically 800+ characters long
 * 
 * @param {string} uid - String to validate
 * @returns {boolean} - true if valid UID, false if looks like JWT
 */
const isValidUid = (uid) => {
  if (!uid || typeof uid !== 'string') {
    return false;
  }
  
  const uidStr = String(uid).trim();
  
  // Firebase UIDs are typically 28 characters (can be 20-30)
  // JWT tokens are typically 800+ characters
  if (uidStr.length > 100) {
    console.warn(`⚠️  String looks like JWT token (length: ${uidStr.length}): ${uidStr.substring(0, 20)}...`);
    return false;
  }
  
  // Firebase UIDs are alphanumeric (and some special chars)
  // JWT tokens contain dots (.)
  if (uidStr.includes('.')) {
    console.warn(`⚠️  String contains dots (likely JWT token): ${uidStr.substring(0, 20)}...`);
    return false;
  }
  
  // Valid UID
  return true;
};

/**
 * Clean participants array to remove JWT tokens and keep only valid UIDs
 * 
 * @param {Array} participants - Participants array (may contain JWT tokens)
 * @returns {Array<string>} - Cleaned array with only valid UIDs
 */
const cleanParticipantsArray = (participants) => {
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
    
    // Skip if looks like JWT token
    if (!isValidUid(participantStr)) {
      console.warn(`⚠️  Skipping invalid participant (likely JWT token): ${participantStr.substring(0, 20)}...`);
      continue;
    }
    
    // Skip duplicates
    if (seen.has(participantStr)) {
      continue;
    }
    
    cleaned.push(participantStr);
    seen.add(participantStr);
  }
  
  return cleaned;
};

/**
 * Decode JWT token to get UID (if it's a valid Firebase ID token)
 * 
 * @param {string} token - JWT token string
 * @returns {Promise<string|null>} - UID if token is valid, null otherwise
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
    console.warn(`⚠️  Failed to decode token: ${error.message}`);
    return null;
  }
};

/**
 * Generate unique chat room ID from two user IDs and optional productId.
 * When productId is provided the generated ID will include it, allowing
 * multiple rooms between the same participants for different products.
 * Uses SHA-256 hash to ensure ID is compact and safe for Firestore.
 *
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {string|null} productId - Optional product ID to scope the room
 * @returns {string} Unique chat room ID (hashed, 32 chars)
 */
const generateChatRoomId = (userId1, userId2, productId = null) => {
  // Sort user IDs alphabetically to ensure consistency
  const sortedIds = [String(userId1), String(userId2)].sort();

  // Include productId when provided so different products produce different room IDs
  const uniqueString = productId
    ? `${sortedIds[0]}_${sortedIds[1]}_product_${String(productId)}`
    : `${sortedIds[0]}_${sortedIds[1]}`;

  const hash = crypto.createHash('sha256').update(uniqueString).digest('hex');
  return hash.substring(0, 32);
};

/**
 * Find existing chat room between two users.
 * Updated behavior: prefer rooms that match the same `productId` so
 * the same two users can have separate chat rooms per product.
 * If `productId` is provided we first search for a room with both
 * participants AND the same productId. If none found, fall back to
 * searching for any room that contains both users (legacy behavior).
 *
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {string|null} productId - Optional product ID to scope the search
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot|null>} - Existing room doc or null
 */
const findExistingChatRoom = async (userId1, userId2, productId = null) => {
  const userId1Str = String(userId1);
  const userId2Str = String(userId2);

  // Helper to check if a doc contains both participants
  const docHasBothParticipants = (doc) => {
    const data = doc.data();
    const participants = cleanParticipantsArray(data.participants || []);
    const hasUser1 = participants.includes(userId1Str);
    const hasUser2 = participants.includes(userId2Str);
    return hasUser1 && hasUser2;
  };

  // If productId provided, ONLY search for room matching this specific product
  // This ensures separate rooms per product (no fallback to generic room)
  if (productId) {
    console.log(`🔍 Searching for room with productId=${productId} and participants containing ${userId1Str}`);
    const prodSnapshot = await db.collection('chatRooms')
      .where('productId', '==', String(productId))
      .where('participants', 'array-contains', userId1Str)
      .get();

    console.log(`📊 Found ${prodSnapshot.docs.length} rooms with productId=${productId}`);
    
    for (const doc of prodSnapshot.docs) {
      if (docHasBothParticipants(doc)) {
        console.log(`✅ Found existing chat room for product ${productId}: ${doc.id}`);
        return doc;
      }
    }
    
    console.log(`❌ No existing room found for product ${productId} - will create new one`);
    return null;
  }

  // Legacy: if no productId provided, search for any room between users
  console.log(`🔍 No productId provided, searching for any room between ${userId1Str} and ${userId2Str}`);
  const allRoomsSnapshot = await db.collection('chatRooms')
    .where('participants', 'array-contains', userId1Str)
    .get();

  for (const doc of allRoomsSnapshot.docs) {
    if (docHasBothParticipants(doc)) {
      console.log(`✅ Found existing chat room: ${doc.id} for users ${userId1Str} and ${userId2Str}`);
      return doc;
    }
  }

  return null;
};

/**
 * @desc    Get all chat rooms for the logged-in user
 * @route   GET /api/chat
 * @access  Private
 * @note    MULTI-USER: Returns only chat rooms where user is a participant
 */
const getChatRooms = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('User not authenticated');
  }

  // CRITICAL FIX: ใช้ req.user.uid เท่านั้น (ไม่ใช้ req.user.id)
  if (!req.user || !req.user.uid) {
    console.error("🔥 getChatRooms error: req.user.uid is missing", req.user);
    res.status(401);
    throw new Error('User ID not found - uid is required');
  }
  
  // Validate that uid is not a token string
  if (req.user.uid.length > 100) {
    console.error(`🔥 getChatRooms error: req.user.uid looks like a token string (length: ${req.user.uid.length})`);
    res.status(401);
    throw new Error('Invalid user ID - uid appears to be a token string');
  }
  
  const userId = String(req.user.uid); // ✅ ใช้ uid เท่านั้น

  // MULTI-USER: Get chat rooms where user is a participant
  const chatsSnapshot = await db.collection('chatRooms')
    .where('participants', 'array-contains', userId)
    .get();

  const chatRooms = chatsSnapshot.docs.map(doc => {
    const data = doc.data();
    // CRITICAL: Clean participants array to remove JWT tokens
    const participants = cleanParticipantsArray(data.participants || []);
    const userIdStr = String(userId);
    
    return {
      id: doc.id,
      ...data,
      // Ensure participants are strings
      participants: participants,
      // Determine other participant
      otherParticipantId: participants.find(id => String(id) !== userIdStr) || null,
      otherParticipantName: data.otherParticipantName || 
                           (data.participantNames && Array.isArray(data.participantNames) 
                             ? data.participantNames[participants.findIndex(id => String(id) !== userIdStr)] 
                             : null) ||
                           'Unknown',
    };
  });

  // Sort by last message timestamp (newest first)
  chatRooms.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  res.status(200).json({ success: true, data: chatRooms });
});

/**
 * @desc    Create or get existing chat room
 * @route   POST /api/chat
 * @access  Private
 * @note    MULTI-USER: Creates ONE room per user pair (not per product)
 *          If room exists, returns existing room
 *          CRITICAL: Always ensures participants[] contains both users
 */
const createChatRoom = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('User not authenticated');
  }

  const { productId } = req.body;
  if (!productId) {
    res.status(400);
    throw new Error('Product ID is required');
  }

  // CRITICAL FIX: ใช้ req.user.uid เท่านั้น
  if (!req.user || !req.user.uid) {
    console.error("🔥 createChatRoom error: req.user.uid is missing", req.user);
    res.status(401);
    throw new Error('User ID not found - uid is required');
  }
  
  // Validate that uid is not a token string
  if (req.user.uid.length > 100) {
    console.error(`🔥 createChatRoom error: req.user.uid looks like a token string (length: ${req.user.uid.length})`);
    res.status(401);
    throw new Error('Invalid user ID - uid appears to be a token string');
  }
  
  const buyerId = String(req.user.uid); // ✅ ใช้ uid เท่านั้น
  
  console.log(`📝 createChatRoom - buyerId (uid): ${buyerId} (length: ${buyerId.length})`);

  // Get product to find seller
  const productDoc = await db.collection('products').doc(productId).get();
  if (!productDoc.exists) {
    res.status(404);
    throw new Error('Product not found');
  }

  const product = productDoc.data();
  // CRITICAL FIX: Normalize sellerId to string
  const sellerId = String(product.userId || '');

  if (!sellerId) {
    res.status(400);
    throw new Error('Product seller ID not found');
  }

  // Prevent users from chatting with themselves
  if (sellerId === buyerId) {
    res.status(400);
    throw new Error("You cannot start a chat for your own product");
  }

  // CRITICAL: Validate UIDs before proceeding
  if (!isValidUid(buyerId)) {
    console.error(`❌ createChatRoom - buyerId is invalid (likely JWT token): ${buyerId.substring(0, 20)}...`);
    res.status(401);
    throw new Error('Invalid buyer ID - must be Firebase UID, not JWT token');
  }
  
  if (!isValidUid(sellerId)) {
    console.error(`❌ createChatRoom - sellerId is invalid (likely JWT token): ${sellerId.substring(0, 20)}...`);
    res.status(400);
    throw new Error('Invalid seller ID - must be Firebase UID, not JWT token');
  }
  
  // CRITICAL: Log both UIDs for debugging
  console.log(`📝 createChatRoom - buyerId: ${buyerId} (length: ${buyerId.length})`);
  console.log(`📝 createChatRoom - sellerId: ${sellerId} (length: ${sellerId.length})`);

  // CRITICAL: Try to find an existing chat room scoped to the product first
  // This allows the same two users to have separate chat rooms per product.
  console.log(`🔍 Searching for existing room: buyerId=${buyerId}, sellerId=${sellerId}, productId=${productId}`);
  const existingRoomDoc = await findExistingChatRoom(buyerId, sellerId, productId);

  if (existingRoomDoc) {
    // Room exists, return it
    const existingData = existingRoomDoc.data();
    console.log(`✅ Found existing room ${existingRoomDoc.id} for product ${productId}`);
    
    // CRITICAL FIX: Clean participants array to remove JWT tokens
    let participants = cleanParticipantsArray(existingData.participants || []);
    
    const buyerIdStr = String(buyerId);
    const sellerIdStr = String(sellerId);
    
    // FIX: Ensure both users are in participants array (with valid UIDs only)
    if (!participants.includes(buyerIdStr)) {
      participants.push(buyerIdStr);
    }
    if (!participants.includes(sellerIdStr)) {
      participants.push(sellerIdStr);
    }
    
    // CRITICAL: Clean again to ensure no JWT tokens
    participants = cleanParticipantsArray(participants);
    
    // Update participants if needed (fix old rooms with JWT tokens)
    const originalParticipants = Array.isArray(existingData.participants) 
      ? existingData.participants.map(p => String(p)) 
      : [];
    
    if (participants.length !== originalParticipants.length || 
        !participants.includes(buyerIdStr) || 
        !participants.includes(sellerIdStr) ||
        JSON.stringify(participants.sort()) !== JSON.stringify(originalParticipants.sort())) {
      console.log(`🔧 Fixing participants array for room ${existingRoomDoc.id}`);
      console.log(`   Before: ${JSON.stringify(originalParticipants)}`);
      console.log(`   After: ${JSON.stringify(participants)}`);
      await existingRoomDoc.ref.update({
        participants: participants,
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: existingRoomDoc.id,
        ...existingData,
        participants: participants, // Ensure participants are strings
        otherParticipantId: participants.find(id => String(id) !== buyerIdStr) || null,
      },
      message: "Chat room already exists"
    });
    return;
  }

  // Generate unique chat room ID. Include productId so same users can have
  // separate rooms per product.
  const chatRoomId = generateChatRoomId(buyerId, sellerId, productId);
  console.log(`🆕 No existing room found, generating new ID: ${chatRoomId} for product ${productId}`);

  // Double-check: Make sure room doesn't exist with this ID
  const chatRoomRef = db.collection('chatRooms').doc(chatRoomId);
  const chatRoomDoc = await chatRoomRef.get();

  if (chatRoomDoc.exists) {
    // Room exists with this ID, return it
    const existingData = chatRoomDoc.data();
    // CRITICAL: Clean participants array to remove JWT tokens
    let participants = cleanParticipantsArray(existingData.participants || []);
    
    // Ensure both users are in participants
    const buyerIdStr = String(buyerId);
    const sellerIdStr = String(sellerId);
    if (!participants.includes(buyerIdStr)) {
      participants.push(buyerIdStr);
    }
    if (!participants.includes(sellerIdStr)) {
      participants.push(sellerIdStr);
    }
    participants = cleanParticipantsArray(participants);
    
    // Fix if needed
    const originalParticipants = Array.isArray(existingData.participants) 
      ? existingData.participants.map(p => String(p)) 
      : [];
    if (JSON.stringify(participants.sort()) !== JSON.stringify(originalParticipants.sort())) {
      await chatRoomDoc.ref.update({ participants: participants });
      console.log(`🔧 Fixed participants array for room ${chatRoomId}`);
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: chatRoomId,
        ...existingData,
        participants: participants,
        otherParticipantId: participants.find(id => String(id) !== String(buyerId)) || null,
      },
      message: "Chat room already exists"
    });
    return;
  }

  // Get user names for the chat room
  const buyerDoc = await db.collection('users').doc(buyerId).get();
  const sellerDoc = await db.collection('users').doc(sellerId).get();
  
  // SAFETY CHECK: Get user names with fallbacks
  const buyerData = buyerDoc.exists ? buyerDoc.data() : null;
  const buyerName = (buyerData && buyerData.name) || req.user.displayName || req.user.name || 'Buyer';
  
  const sellerData = sellerDoc.exists ? sellerDoc.data() : null;
  const sellerName = (sellerData && sellerData.name) || product.farmName || 'Seller';

  // Create new chat room
  // CRITICAL: Ensure participants array ALWAYS contains both users as strings (valid UIDs only)
  // NEVER store JWT tokens in participants array
  const participants = cleanParticipantsArray([buyerId, sellerId]);
  
  if (participants.length !== 2) {
    console.error(`❌ createChatRoom - Failed to create valid participants array`);
    console.error(`   buyerId: ${buyerId}, sellerId: ${sellerId}`);
    res.status(500);
    throw new Error('Failed to create chat room - invalid participant IDs');
  }
  
  const newChatRoom = {
    participants: participants, // MULTI-USER: Array of participant IDs (as strings, valid UIDs only)
    participantNames: [buyerName, sellerName], // Names corresponding to participants array
    productId: String(productId), // Store product ID for reference (but room is per user pair)
    productTitle: product.title || '',
    productImage: (product.images && Array.isArray(product.images) && product.images.length > 0) 
      ? product.images[0] 
      : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessage: '',
    lastMessageSenderId: null,
    // Legacy fields for backward compatibility
    buyerId: String(buyerId),
    sellerId: String(sellerId),
    buyerName: buyerName,
    sellerName: sellerName,
  };
  
  // DEBUG: Log for troubleshooting
  console.log(`📝 Creating NEW chat room - chatRoomId: ${chatRoomId}`);
  console.log(`📝 Participants: ${JSON.stringify(newChatRoom.participants)}`);
  console.log(`📝 Buyer: ${buyerId}, Seller: ${sellerId}`);

  await chatRoomRef.set(newChatRoom);

  res.status(201).json({
    success: true,
    data: {
      id: chatRoomId,
      ...newChatRoom,
      otherParticipantId: sellerId,
    },
  });
});

/**
 * @desc    Get a single chat room by ID
 * @route   GET /api/chat/:id
 * @access  Private
 * @note    MULTI-USER: Only participants can access the room
 *          CRITICAL: Validates participants array and fixes if needed
 */
const getChatRoomById = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('User not authenticated');
  }

  // CRITICAL FIX: ใช้ req.user.uid เท่านั้น
  if (!req.user || !req.user.uid) {
    console.error("🔥 getChatRoomById error: req.user.uid is missing", req.user);
    res.status(401);
    throw new Error('User ID not found - uid is required');
  }
  
  // Validate that uid is not a token string
  if (req.user.uid.length > 100) {
    console.error(`🔥 getChatRoomById error: req.user.uid looks like a token string (length: ${req.user.uid.length})`);
    res.status(401);
    throw new Error('Invalid user ID - uid appears to be a token string');
  }
  
  const userId = String(req.user.uid); // ✅ ใช้ uid เท่านั้น

  const chatRoomId = req.params.id;
  const chatRoomDoc = await db.collection('chatRooms').doc(chatRoomId).get();

  if (!chatRoomDoc.exists) {
    res.status(404);
    throw new Error('Chat room not found');
  }

  const chatRoomData = chatRoomDoc.data();
  
  // MULTI-USER: Check if user is a participant
  // CRITICAL: Clean participants array to remove JWT tokens
  let participants = cleanParticipantsArray(chatRoomData.participants || []);
  const userIdStr = String(userId);
  
  // CRITICAL FIX: If participants array is empty or invalid, try to reconstruct from legacy fields
  if (participants.length === 0) {
    console.log(`⚠️  Chat room ${chatRoomId} has empty participants, trying to reconstruct from legacy fields`);
    const buyerId = String(chatRoomData.buyerId || '');
    const sellerId = String(chatRoomData.sellerId || '');
    
    if (buyerId && sellerId && isValidUid(buyerId) && isValidUid(sellerId)) {
      participants = cleanParticipantsArray([buyerId, sellerId]);
      // Fix the room
      await chatRoomDoc.ref.update({ participants: participants });
      console.log(`✅ Fixed participants array for room ${chatRoomId}`);
    }
  }
  
  // CRITICAL: If participants array contains JWT tokens, try to decode them
  const originalParticipants = Array.isArray(chatRoomData.participants) 
    ? chatRoomData.participants.map(p => String(p)) 
    : [];
  
  if (originalParticipants.length > participants.length) {
    console.log(`⚠️  Chat room ${chatRoomId} has JWT tokens in participants, attempting to decode...`);
    const cleanedParticipants = [...participants];
    
    for (const participant of originalParticipants) {
      if (!isValidUid(participant)) {
        // Try to decode JWT token
        const decodedUid = await decodeTokenToUid(participant);
        if (decodedUid && !cleanedParticipants.includes(decodedUid)) {
          cleanedParticipants.push(decodedUid);
          console.log(`✅ Decoded JWT token to UID: ${decodedUid}`);
        }
      }
    }
    
    if (cleanedParticipants.length > participants.length) {
      participants = cleanParticipantsArray(cleanedParticipants);
      await chatRoomDoc.ref.update({ participants: participants });
      console.log(`✅ Fixed participants array by decoding JWT tokens`);
    }
  }
  
  const isParticipant = participants.includes(userIdStr);
  if (!isParticipant) {
    console.error(`❌ getChatRoomById - User ${userIdStr} is not a participant in room ${chatRoomId}`);
    console.error(`❌ Participants: ${JSON.stringify(participants)}`);
    console.error(`❌ User ID: ${userIdStr}`);
    res.status(403);
    throw new Error('Not authorized to access this chat room');
  }

  res.status(200).json({
    success: true,
    data: {
      id: chatRoomDoc.id,
      ...chatRoomData,
      participants: participants, // Ensure participants are strings
      otherParticipantId: participants.find(id => String(id) !== userIdStr) || null,
    }
  });
});

/**
 * @desc    Post a new message
 * @route   POST /api/chat/:id/messages
 * @access  Private
 * @note    MULTI-USER: Message includes senderId and receiverId
 *          CRITICAL: Validates and fixes participants array if needed
 */
const postMessage = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('User not authenticated');
  }

  // CRITICAL FIX: ใช้ req.user.uid เท่านั้น
  if (!req.user || !req.user.uid) {
    console.error("🔥 postMessage error: req.user.uid is missing", req.user);
    res.status(401);
    throw new Error('User ID not found - uid is required');
  }
  
  // Validate that uid is not a token string
  if (req.user.uid.length > 100) {
    console.error(`🔥 postMessage error: req.user.uid looks like a token string (length: ${req.user.uid.length})`);
    res.status(401);
    throw new Error('Invalid user ID - uid appears to be a token string');
  }
  
  const senderId = String(req.user.uid); // ✅ ใช้ uid เท่านั้น

  const chatRoomId = req.params.id;
  const { text } = req.body;

  if (!text || text.trim() === '') {
    res.status(400);
    throw new Error('Message text is required');
  }

  // Get chat room
  const chatRoomRef = db.collection('chatRooms').doc(chatRoomId);
  const chatRoomDoc = await chatRoomRef.get();

  if (!chatRoomDoc.exists) {
    res.status(404);
    throw new Error('Chat room not found');
  }

  const chatRoomData = chatRoomDoc.data();
  
  // MULTI-USER: Check if user is a participant
  // CRITICAL: Clean participants array to remove JWT tokens
  let participants = cleanParticipantsArray(chatRoomData.participants || []);
  const senderIdStr = String(senderId);
  
  // CRITICAL FIX: If participants array is empty or invalid, try to reconstruct from legacy fields
  if (participants.length === 0) {
    console.log(`⚠️  Chat room ${chatRoomId} has empty participants, trying to reconstruct from legacy fields`);
    const buyerId = String(chatRoomData.buyerId || '');
    const sellerId = String(chatRoomData.sellerId || '');
    
    if (buyerId && sellerId && isValidUid(buyerId) && isValidUid(sellerId)) {
      participants = cleanParticipantsArray([buyerId, sellerId]);
      // Fix the room
      await chatRoomRef.update({ participants: participants });
      console.log(`✅ Fixed participants array for room ${chatRoomId}`);
    }
  }
  
  // CRITICAL: If participants array contains JWT tokens, try to decode them
  const originalParticipants = Array.isArray(chatRoomData.participants) 
    ? chatRoomData.participants.map(p => String(p)) 
    : [];
  
  if (originalParticipants.length > participants.length) {
    console.log(`⚠️  Chat room ${chatRoomId} has JWT tokens in participants, attempting to decode...`);
    const cleanedParticipants = [...participants];
    
    for (const participant of originalParticipants) {
      if (!isValidUid(participant)) {
        // Try to decode JWT token
        const decodedUid = await decodeTokenToUid(participant);
        if (decodedUid && !cleanedParticipants.includes(decodedUid)) {
          cleanedParticipants.push(decodedUid);
          console.log(`✅ Decoded JWT token to UID: ${decodedUid}`);
        }
      }
    }
    
    if (cleanedParticipants.length > participants.length) {
      participants = cleanParticipantsArray(cleanedParticipants);
      await chatRoomRef.update({ participants: participants });
      console.log(`✅ Fixed participants array by decoding JWT tokens`);
    }
  }
  
  // CRITICAL: Ensure sender is in participants array (fix if needed)
  if (!participants.includes(senderIdStr)) {
    console.log(`⚠️  Sender ${senderIdStr} not in participants, fixing...`);
    participants.push(senderIdStr);
    participants = cleanParticipantsArray(participants);
    await chatRoomRef.update({ participants: participants });
    console.log(`✅ Added sender to participants array`);
  }
  
  const isParticipant = participants.includes(senderIdStr);
  if (!isParticipant) {
    console.error(`❌ postMessage - User ${senderIdStr} is not a participant in room ${chatRoomId}`);
    console.error(`❌ Participants: ${JSON.stringify(participants)}`);
    res.status(403);
    throw new Error('Not authorized to post in this chat room');
  }

  // MULTI-USER: Determine receiver (the other participant)
  const receiverId = participants.find(id => String(id) !== senderIdStr);
  if (!receiverId) {
    res.status(400);
    throw new Error('Cannot determine receiver');
  }

  // Create message with senderId and receiverId
  const newMessage = {
    chatRoomId,
    senderId,        // MULTI-USER: Who sent the message
    receiverId,      // MULTI-USER: Who receives the message
    text: text.trim(),
    timestamp: new Date().toISOString(),
    read: false,
  };

  // MULTI-USER: Store message in subcollection
  const messageRef = await chatRoomRef.collection('messages').add(newMessage);
  
  // Update chat room with last message
  await chatRoomRef.update({
    lastMessage: text.trim(),
    lastMessageSenderId: senderId,
    updatedAt: new Date().toISOString(),
  });


  // Send push notification to receiver (don't wait for it to complete)
  let senderName = 'Someone';
  try {
    // Try to get sender name from chat room participant names
    if (chatRoomData.participantNames && Array.isArray(chatRoomData.participantNames)) {
      const senderIndex = participants.findIndex(id => String(id) === senderIdStr);
      if (senderIndex >= 0 && chatRoomData.participantNames[senderIndex]) {
        senderName = chatRoomData.participantNames[senderIndex];
      }
    }
    // If not found, try to get from user document
    if (senderName === 'Someone') {
      const senderDoc = await db.collection('users').doc(senderId).get();
      if (senderDoc.exists) {
        const senderData = senderDoc.data();
        senderName = senderData.name || senderData.displayName || senderData.email?.split('@')[0] || 'Someone';
      }
    }
  } catch (error) {
    console.error('Error getting sender name for notification:', error);
  }

  // Send notification asynchronously (don't block the response)
  sendPushNotification(receiverId, {
    title: 'คุณได้รับข้อความใหม่',
    body: `${senderName}: ${text.trim()}`,
    icon: '/icon-192x192.png',
    data: {
      chatId: chatRoomId,
      senderId: senderId,
      senderName: senderName,
      click_action: '/chat',
      type: 'chat',
    },
  }).catch(error => {
    console.error('Failed to send push notification:', error);
  });

  res.status(201).json({
    success: true,
    data: {
      id: messageRef.id,
      ...newMessage
    }
  });
});

/**
 * @desc    Get messages for a chat room
 * @route   GET /api/chat/:id/messages
 * @access  Private
 * @note    MULTI-USER: Only participants can access messages
 *          CRITICAL: Validates and fixes participants array if needed
 */
const getMessages = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('User not authenticated');
  }

  // CRITICAL FIX: ใช้ req.user.uid เท่านั้น
  if (!req.user || !req.user.uid) {
    console.error("🔥 getMessages error: req.user.uid is missing", req.user);
    res.status(401);
    throw new Error('User ID not found - uid is required');
  }
  
  // Validate that uid is not a token string
  if (req.user.uid.length > 100) {
    console.error(`🔥 getMessages error: req.user.uid looks like a token string (length: ${req.user.uid.length})`);
    res.status(401);
    throw new Error('Invalid user ID - uid appears to be a token string');
  }
  
  const userId = String(req.user.uid); // ✅ ใช้ uid เท่านั้น

  const chatRoomId = req.params.id;
  const chatRoomDoc = await db.collection('chatRooms').doc(chatRoomId).get();

  if (!chatRoomDoc.exists) {
    res.status(404);
    throw new Error('Chat room not found');
  }

  const chatRoomData = chatRoomDoc.data();
  
  // DEBUG: Log for troubleshooting
  console.log(`🔍 getMessages - chatRoomId: ${chatRoomId}`);
  console.log(`🔍 getMessages - userId: ${userId} (type: ${typeof userId})`);
  console.log(`🔍 getMessages - participants (raw):`, chatRoomData.participants);
  
  // MULTI-USER: Check if user is a participant
  // CRITICAL: Clean participants array to remove JWT tokens
  let participants = cleanParticipantsArray(chatRoomData.participants || []);
  const userIdStr = String(userId);
  
  // CRITICAL FIX: If participants array is empty or invalid, try to reconstruct from legacy fields
  if (participants.length === 0) {
    console.log(`⚠️  Chat room ${chatRoomId} has empty participants, trying to reconstruct from legacy fields`);
    const buyerId = String(chatRoomData.buyerId || '');
    const sellerId = String(chatRoomData.sellerId || '');
    
    if (buyerId && sellerId && isValidUid(buyerId) && isValidUid(sellerId)) {
      participants = cleanParticipantsArray([buyerId, sellerId]);
      // Fix the room
      await chatRoomDoc.ref.update({ participants: participants });
      console.log(`✅ Fixed participants array for room ${chatRoomId}`);
    }
  }
  
  // CRITICAL: If participants array contains JWT tokens, try to decode them
  const originalParticipants = Array.isArray(chatRoomData.participants) 
    ? chatRoomData.participants.map(p => String(p)) 
    : [];
  
  if (originalParticipants.length > participants.length) {
    console.log(`⚠️  Chat room ${chatRoomId} has JWT tokens in participants, attempting to decode...`);
    const cleanedParticipants = [...participants];
    
    for (const participant of originalParticipants) {
      if (!isValidUid(participant)) {
        // Try to decode JWT token
        const decodedUid = await decodeTokenToUid(participant);
        if (decodedUid && !cleanedParticipants.includes(decodedUid)) {
          cleanedParticipants.push(decodedUid);
          console.log(`✅ Decoded JWT token to UID: ${decodedUid}`);
        }
      }
    }
    
    if (cleanedParticipants.length > participants.length) {
      participants = cleanParticipantsArray(cleanedParticipants);
      await chatRoomDoc.ref.update({ participants: participants });
      console.log(`✅ Fixed participants array by decoding JWT tokens`);
    }
  }
  
  console.log(`🔍 getMessages - participants (cleaned):`, participants);
  console.log(`🔍 getMessages - userIdStr: ${userIdStr}`);
  
  // Check if user is in participants
  const isParticipant = participants.includes(userIdStr);
  
  // CRITICAL FIX: If user is not in participants but should be (based on legacy fields), fix it
  if (!isParticipant) {
    const buyerId = String(chatRoomData.buyerId || '');
    const sellerId = String(chatRoomData.sellerId || '');
    
    // Check if user matches buyer or seller (and they are valid UIDs)
    if ((buyerId === userIdStr || sellerId === userIdStr) && isValidUid(buyerId) && isValidUid(sellerId)) {
      console.log(`⚠️  User ${userIdStr} should be in participants but isn't, fixing...`);
      // Add user to participants
      if (!participants.includes(userIdStr)) {
        participants.push(userIdStr);
      }
      // Ensure both buyer and seller are in participants (if valid UIDs)
      if (buyerId && isValidUid(buyerId) && !participants.includes(buyerId)) {
        participants.push(buyerId);
      }
      if (sellerId && isValidUid(sellerId) && !participants.includes(sellerId)) {
        participants.push(sellerId);
      }
      participants = cleanParticipantsArray(participants);
      // Update the room
      await chatRoomDoc.ref.update({ participants: participants });
      console.log(`✅ Fixed participants array - added user ${userIdStr}`);
    } else {
      // User is truly not authorized
      console.error(`❌ getMessages - User ${userIdStr} is not a participant in room ${chatRoomId}`);
      console.error(`❌ Stored participants: ${JSON.stringify(participants)}`);
      console.error(`❌ Legacy buyerId: ${buyerId} (valid: ${isValidUid(buyerId)}), sellerId: ${sellerId} (valid: ${isValidUid(sellerId)})`);
      res.status(403);
      throw new Error('Not authorized to access this chat room');
    }
  }
  
  console.log(`✅ getMessages - User ${userIdStr} is authorized to access room ${chatRoomId}`);

  // MULTI-USER: Get messages from subcollection
  const messagesSnapshot = await db.collection('chatRooms')
    .doc(chatRoomId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .get();

  const messages = messagesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.status(200).json({ success: true, data: messages });
});

/**
 * @desc    Delete a chat room (Admin only)
 * @route   DELETE /api/chat/:id
 * @access  Private/Admin
 */
const deleteChatRoom = asyncHandler(async (req, res) => {
  const chatRoomId = req.params.id;

  // TODO: Add logic to delete subcollection (messages) if needed, or use a Firebase Function
  await db.collection('chatRooms').doc(chatRoomId).delete();

  res.status(200).json({ success: true, message: 'Chat room deleted' });
});

export {
  getChatRooms,
  createChatRoom,
  getChatRoomById,
  postMessage,
  getMessages,
  deleteChatRoom
};
