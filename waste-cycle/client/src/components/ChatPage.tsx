/**
 * ChatPage Component - API-based Multi-User Chat
 * 
 * MULTI-USER CHAT SYSTEM:
 * - Uses API endpoints instead of direct Firestore access
 * - Prevents Firestore permission errors
 * - Backend handles authorization
 * - Polling for real-time-like updates
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, ArrowLeft, Check, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { User, Post } from '../App';
import { getChatRooms as apiGetChatRooms, getChatMessages, sendChatMessage, createChatRoom, deleteChatRoom } from '../apiServer';
import type { ChatRoom, Message } from '../services/chatService';
import { isUserParticipant } from '../utils/chatUtils';

interface ChatPageProps {
  user: User;
  chatRooms: ChatRoom[];
  posts: Post[];
  confirmedRoomIds: Set<string>;
  chatMessages: Record<string, Message[]>;
  setChatMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  onBack: () => void;
  onConfirmSale?: (postId: string, roomId: string) => void;
  onCancelChat?: (roomId: string) => void;
  onDeleteChatRoom?: (roomId: string) => void;
  initialRoomId?: string | null;
}

export function ChatPage({ 
  user, 
  chatRooms, 
  posts, 
  confirmedRoomIds, 
  chatMessages, 
  setChatMessages, 
  onBack, 
  onConfirmSale, 
  onCancelChat, 
  onDeleteChatRoom, 
  initialRoomId 
}: ChatPageProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    initialRoomId || (chatRooms.length > 0 ? chatRooms[chatRooms.length - 1].id : null)
  );

  // If the selected room is deleted from chatRooms, clear selection to stop polling and prevent repeated DELETEs
  useEffect(() => {
    if (selectedRoomId && !chatRooms.some(room => room.id === selectedRoomId)) {
      setSelectedRoomId(null);
      setShowChatView(false);
    }
  }, [selectedRoomId, chatRooms]);

  // Handle initialRoomId prop changes (e.g., from notification clicks)
  // Only update when initialRoomId changes, not when selectedRoomId changes
  useEffect(() => {
    if (initialRoomId) {
      setSelectedRoomId(initialRoomId);
      setShowChatView(true);
    }
  }, [initialRoomId]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showChatView, setShowChatView] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedRoom = chatRooms.find(room => room.id === selectedRoomId);
  const selectedPost = selectedRoom ? posts.find(p => p.id === selectedRoom.postId || p.id === selectedRoom.productId) : null;
  const messages = selectedRoomId ? (chatMessages[selectedRoomId] || []) : [];
  const isConfirmed = selectedRoomId ? confirmedRoomIds.has(selectedRoomId) : false;
  
  // MULTI-USER: Filter chat rooms by current user
  // CRITICAL: Use String() comparison to handle type mismatches
  const currentUserId = String(user.uid || user.id);
  
  // Filter rooms where current user is a participant
  // CRITICAL: Only show rooms where user is actually a participant (prevents 403 errors)
  const myChats = chatRooms.filter(room => {
    return isUserParticipant(room, currentUserId);
  });
  
  // Contact requests are rooms where user is the seller (other person initiated)
  // For now, we'll show all rooms where user is a participant
  // You can add more specific logic if needed
  const contactRequests: ChatRoom[] = []; // Can be customized later if needed
  
  const filteredMyChats = myChats.filter(room => {
    const displayName = room.otherParticipantName || room.sellerName || 'Unknown';
    const farmName = room.farmName || '';
    const productTitle = room.productTitle || '';
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           productTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  const filteredContactRequests = contactRequests.filter(room => {
    const displayName = room.otherParticipantName || room.buyerName || 'Unknown';
    const farmName = room.farmName || '';
    const productTitle = room.productTitle || '';
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           productTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // For now, show all user's chats in both tabs
  // You can customize this later if you want to separate "my chats" and "contact requests"
  const displayRooms = activeTab === 'chat' ? filteredMyChats : filteredMyChats;

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // MULTI-USER: Load messages when room is selected (via API)
  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }
    const pollIntervalRef = { id: 0 } as { id: number | null };
    let mounted = true;

    const loadMessages = async () => {
      if (!mounted) return;
      try {
        const response = await getChatMessages(selectedRoomId);
        const msgs = response.data.data || [];
        // SAFETY CHECK: Ensure messages is an array
        setChatMessages(prev => ({
          ...prev,
          [selectedRoomId]: Array.isArray(msgs) ? msgs : []
        }));
      } catch (error) {
        console.error('Error loading messages:', error);
        setChatMessages(prev => ({
          ...prev,
          [selectedRoomId]: []
        }));
      }
    };

    // Start polling: call immediately, then every 5s
    const startPolling = () => {
      // immediate load
      loadMessages();
      // slower polling to reduce backend token verification spam
      pollIntervalRef.id = window.setInterval(loadMessages, 5000);
    };

    // Stop polling helper
    const stopPolling = () => {
      if (pollIntervalRef.id) {
        clearInterval(pollIntervalRef.id);
        pollIntervalRef.id = null;
      }
    };

    // Visibility handling: pause polling when tab hidden
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // resume polling when visible
        if (!pollIntervalRef.id) startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedRoomId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedRoomId) return;

    try {
      // MULTI-USER: Send message via API (backend handles senderId/receiverId)
      await sendChatMessage(selectedRoomId, newMessage.trim());
      
      // Reload messages to get the new one
      const response = await getChatMessages(selectedRoomId);
      const msgs = response.data.data || [];
      setChatMessages(prev => ({
        ...prev,
        [selectedRoomId]: Array.isArray(msgs) ? msgs : []
      }));
      
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleRoomClick = (roomId: string) => {
    // Always switch to the clicked room (removed toggle logic to fix switching issue)
    console.log(`🔄 Switching to room ${roomId}`);
    setSelectedRoomId(roomId);
    setShowChatView(true);
  };

  const handleBackToList = () => {
    setShowChatView(false);
    setSelectedRoomId(null);
  };

  const handleCancelChat = () => {
    if (!selectedRoomId) return;
    if (onCancelChat) {
      onCancelChat(selectedRoomId);
    }
    setSelectedRoomId(null);
    setShowChatView(false);
  };

  // Delete a chat room by id (can be called from list items)
  const handleDeleteChatById = async (roomId: string) => {
    const ok = window.confirm('ต้องการลบการสนทนานี้หรือไม่? การลบจะไม่สามารถย้อนกลับได้');
    if (!ok) return;

    try {
      await deleteChatRoom(roomId);
      // Remove cached messages for that room
      setChatMessages(prev => {
        const copy = { ...prev } as Record<string, Message[]>;
        delete copy[roomId];
        return copy;
      });

      // If currently viewing this room, close it
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
        setShowChatView(false);
      }

      // Notify parent to clear selection if possible
      if (onCancelChat) onCancelChat(roomId);

      // Notify parent to remove chat room from list
      if (onDeleteChatRoom) {
        onDeleteChatRoom(roomId);
      }
    } catch (err) {
      console.error('Failed to delete chat room:', err);
      alert('ไม่สามารถลบการสนทนาได้ กรุณาลองใหม่');
    }
  };

  const handleConfirmSale = async () => {
    if (!selectedPost || !selectedRoom || !onConfirmSale) return;

    try {
      await onConfirmSale(selectedPost.id, selectedRoom.id);

      // Update UI after confirmation
      setSelectedRoomId(null);
      setShowChatView(false);
      alert('ยืนยันการขายสำเร็จ!');
    } catch (error) {
      console.error('Error confirming sale:', error);
      alert('ไม่สามารถยืนยันการขายได้ กรุณาลองใหม่');
    }
  };

  // Get display name for other participant
  const getDisplayName = (room: ChatRoom) => {
    if (room.otherParticipantName) return room.otherParticipantName;
    if (room.sellerId === user.id) return room.buyerName || 'ผู้ซื้อ';
    if (room.buyerId === user.id) return room.sellerName || 'ผู้ขาย';
    return 'Unknown';
  };

  // Check if message is from current user
  const isMyMessage = (message: Message) => {
    return message.senderId === user.id;
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile View */}
      <div className="lg:hidden">
        {!showChatView ? (
          <Card className="h-[calc(100vh-5rem)] m-4">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="p-4 border-b bg-white flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-xl font-semibold">แชท</h2>
              </div>

              <div className="p-4 border-b">
                <Input
                  placeholder="ค้นหาการสนทนา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-2">
                  <TabsTrigger value="chat">แชท</TabsTrigger>
                  <TabsTrigger value="requests">คนที่มาติดต่อ</TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 overflow-y-auto">
                  {filteredMyChats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p>ไม่มีการสนทนา</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredMyChats.map((room) => {
                        const displayName = getDisplayName(room);
                        return (
                          <div
                            key={room.id}
                            className="p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleRoomClick(room.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">{displayName?.[0] || 'U'}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium truncate">{displayName}</p>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(room.updatedAt || room.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  {room.productTitle || room.farmName || 'ไม่มีชื่อสินค้า'}
                                </p>
                                <p className="text-sm text-gray-500 truncate mt-1">
                                  {room.lastMessage || 'ยังไม่มีข้อความ'}
                                </p>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="bg-red-600 hover:bg-red-700 border border-red-700 shadow-md"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleDeleteChatById(room.id);
                                  }}
                                  aria-label="ลบการสนทนา"
                                >
                                  <X className="w-5 h-5 text-white" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-[calc(100vh-5rem)] m-4">
            <CardContent className="p-0 h-full flex flex-col">
              {selectedRoom ? (
                <>
                  <div className="p-4 border-b bg-white flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={handleBackToList}>
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span>{getDisplayName(selectedRoom)?.[0] || 'U'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{getDisplayName(selectedRoom)}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {selectedRoom.productTitle || selectedRoom.farmName || 'ไม่มีชื่อสินค้า'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages && messages.length > 0 ? (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isMyMessage(message)
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isMyMessage(message) ? 'text-green-100' : 'text-gray-500'
                              }`}
                            >
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <p>ยังไม่มีข้อความ</p>
                        <p className="text-sm mt-2">เริ่มการสนทนากันเลย!</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Confirm Sale Button (Mobile) */}
                  {selectedPost && onConfirmSale && (
                    <div className="p-4 border-t bg-white flex items-center justify-between">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        disabled={selectedPost.sold || isConfirmed}
                        onClick={() => onConfirmSale(selectedPost.id, selectedRoom.id)}
                      >
                        {selectedPost.sold ? 'ขายแล้ว' : (isConfirmed ? 'กำลังดีล' : 'ยืนยันการขาย')}
                      </Button>
                      {/* Status badge: show 'กำลังดีล' while confirmed but not yet finalized, else 'ขายแล้ว' when sold */}
                      {isConfirmed && !selectedPost.sold && (
                        <Badge className="bg-yellow-400 text-black ml-2">กำลังดีล</Badge>
                      )}
                      {selectedPost.sold && (
                        <Badge className="bg-red-500 text-white ml-2">ขายแล้ว</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-4 border-t bg-white">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={isConfirmed || selectedPost?.sold ? 'ไม่สามารถส่งข้อความได้ ขณะกำลังดีล/ขายแล้ว' : 'พิมพ์ข้อความ...'}
                      className="flex-1"
                      disabled={Boolean(isConfirmed || selectedPost?.sold)}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={Boolean(!newMessage.trim() || isConfirmed || selectedPost?.sold)}
                      className="bg-green-600 hover:bg-green-700"
                      size="icon"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>เลือกการสนทนาเพื่อเริ่มแชท</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block container mx-auto px-4 h-[calc(100%-5rem)]">
        <div className="grid grid-cols-3 gap-4 h-full">
          {/* Chat List */}
          <Card className="col-span-1 overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="p-4 border-b bg-white flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-xl font-semibold">แชท</h2>
              </div>

              <div className="p-4 border-b">
                <Input
                  placeholder="ค้นหาการสนทนา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-2">
                  <TabsTrigger value="chat">แชท</TabsTrigger>
                  <TabsTrigger value="requests">คนที่มาติดต่อ</TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 overflow-y-auto">
                  {filteredMyChats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p>ไม่มีการสนทนา</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredMyChats.map((room) => {
                        const displayName = getDisplayName(room);
                        return (
                          <div
                            key={room.id}
                            onClick={() => handleRoomClick(room.id)}
                            className={`p-4 hover:bg-gray-50 cursor-pointer ${
                              selectedRoomId === room.id ? 'bg-gray-100' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">{displayName?.[0] || 'U'}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium truncate">{displayName}</p>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(room.updatedAt || room.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  {room.productTitle || room.farmName || 'ไม่มีชื่อสินค้า'}
                                </p>
                                <p className="text-sm text-gray-500 truncate mt-1">
                                  {room.lastMessage || 'ยังไม่มีข้อความ'}
                                </p>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteChatById(room.id); }}
                                  aria-label="ลบการสนทนา"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="requests" className="flex-1 overflow-y-auto">
                  {filteredContactRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p>ไม่มีประวัติการสนทนา</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredContactRequests.map((room) => {
                        const displayName = getDisplayName(room);
                        return (
                          <div
                            key={room.id}
                            onClick={() => handleRoomClick(room.id)}
                            className={`p-4 hover:bg-gray-50 cursor-pointer ${
                              selectedRoomId === room.id ? 'bg-gray-100' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">{displayName?.[0] || 'U'}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium truncate">{displayName}</p>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(room.updatedAt || room.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  {room.productTitle || room.farmName || 'ไม่มีชื่อสินค้า'}
                                </p>
                                <p className="text-sm text-gray-500 truncate mt-1">
                                  {room.lastMessage || 'ยังไม่มีข้อความ'}
                                </p>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteChatById(room.id); }}
                                  aria-label="ลบการสนทนา"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Chat Messages */}
          <Card className="col-span-2 overflow-hidden">
            {selectedRoom ? (
              <CardContent className="p-0 h-full flex flex-col">
                <div className="p-4 border-b bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span>{getDisplayName(selectedRoom)?.[0] || 'U'}</span>
                    </div>
                    <div>
                      <p className="font-medium">{getDisplayName(selectedRoom)}</p>
                      <p className="text-sm text-gray-600">
                        {selectedRoom.productTitle || selectedRoom.farmName || 'ไม่มีชื่อสินค้า'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages && messages.length > 0 ? (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isMyMessage(message)
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMyMessage(message) ? 'text-green-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>ยังไม่มีข้อความ</p>
                      <p className="text-sm mt-2">เริ่มการสนทนากันเลย!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Confirm Sale Button (Desktop) */}
                {selectedPost && onConfirmSale && (
                  <div className="p-4 border-t bg-white flex items-center justify-between">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      disabled={selectedPost.sold || isConfirmed}
                      onClick={() => onConfirmSale(selectedPost.id, selectedRoom.id)}
                    >
                      {selectedPost.sold || isConfirmed ? 'ขายแล้ว' : 'ยืนยันการขาย'}
                    </Button>
                    {selectedPost.sold && (
                      <Badge className="bg-red-500 text-white ml-2">ขายแล้ว</Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 p-4 border-t bg-white">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="พิมพ์ข้อความ..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="bg-green-600 hover:bg-green-700"
                    size="icon"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="h-full flex items-center justify-center">
                <p className="text-gray-500">เลือกการสนทนาเพื่อเริ่มแชท</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
