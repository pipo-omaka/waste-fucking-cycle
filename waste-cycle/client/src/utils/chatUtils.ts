/**
 * Chat utility functions
 * 
 * Helper functions for chat room management and validation
 */

import type { ChatRoom } from '../services/chatService';

/**
 * Find existing chat room between two users
 * CRITICAL: Ensures ONE room per user pair
 * 
 * @param chatRooms - Array of chat rooms
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns Existing chat room or null
 */
export const findChatRoomBetweenUsers = (
  chatRooms: ChatRoom[],
  userId1: string,
  userId2: string
): ChatRoom | null => {
  const userId1Str = String(userId1);
  const userId2Str = String(userId2);
  
  return chatRooms.find(room => {
    // Support both new format (participants) and legacy format (buyerId/sellerId)
    if (room.participants && Array.isArray(room.participants)) {
      const participants = room.participants.map(p => String(p));
      const hasUser1 = participants.includes(userId1Str);
      const hasUser2 = participants.includes(userId2Str);
      
      // Must have exactly 2 participants (both users)
      return hasUser1 && hasUser2 && participants.length === 2;
    }
    
    // Fallback to legacy format
    const buyerId = String(room.buyerId || '');
    const sellerId = String(room.sellerId || '');
    
    return (buyerId === userId1Str && sellerId === userId2Str) ||
           (buyerId === userId2Str && sellerId === userId1Str);
  }) || null;
};

/**
 * Check if user is a participant in a chat room
 * CRITICAL: Uses String() comparison to handle type mismatches
 * 
 * @param room - Chat room
 * @param userId - User ID to check
 * @returns true if user is a participant
 */
export const isUserParticipant = (room: ChatRoom, userId: string): boolean => {
  const userIdStr = String(userId);
  
  if (room.participants && Array.isArray(room.participants)) {
    const participants = room.participants.map(p => String(p));
    return participants.includes(userIdStr);
  }
  
  // Fallback to legacy format
  const buyerId = String(room.buyerId || '');
  const sellerId = String(room.sellerId || '');
  
  return buyerId === userIdStr || sellerId === userIdStr;
};

/**
 * Get the other participant ID from a chat room
 * 
 * @param room - Chat room
 * @param currentUserId - Current user ID
 * @returns Other participant ID or null
 */
export const getOtherParticipantId = (room: ChatRoom, currentUserId: string): string | null => {
  const currentUserIdStr = String(currentUserId);
  
  if (room.participants && Array.isArray(room.participants)) {
    const participants = room.participants.map(p => String(p));
    return participants.find(id => id !== currentUserIdStr) || null;
  }
  
  // Fallback to legacy format
  const buyerId = String(room.buyerId || '');
  const sellerId = String(room.sellerId || '');
  
  if (buyerId === currentUserIdStr) {
    return sellerId || null;
  }
  if (sellerId === currentUserIdStr) {
    return buyerId || null;
  }
  
  return null;
};

/**
 * Validate that a chat room has valid participants
 * 
 * @param room - Chat room to validate
 * @returns true if room has valid participants
 */
export const hasValidParticipants = (room: ChatRoom): boolean => {
  if (room.participants && Array.isArray(room.participants)) {
    const participants = room.participants.map(p => String(p));
    // Must have exactly 2 participants
    return participants.length === 2 && 
           participants[0] !== participants[1] &&
           participants[0] !== '' &&
           participants[1] !== '';
  }
  
  // Fallback to legacy format
  const buyerId = String(room.buyerId || '');
  const sellerId = String(room.sellerId || '');
  
  return buyerId !== '' && sellerId !== '' && buyerId !== sellerId;
};

