import { useState, useEffect, useCallback } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
// แก้ไข Paths โดยใช้ @/
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Dashboard } from './components/Dashboard';
import { Marketplace } from './components/Marketplace';
import { CreatePost } from './components/CreatePost';
import { PostDetail } from './components/PostDetail';
import { BookingPage } from './components/BookingPage';
import { FertilizerAdvisor } from './components/FertilizerAdvisor';
import { CircularEconomy } from './components/CircularEconomy';
import { AdminPanel } from './components/AdminPanel';
import { ChatPage } from './components/ChatPage';
import { ProfilePage } from './components/ProfilePage';
import { ChatDialog } from './components/ChatDialog';
import { PrivateRoute } from './components/PrivateRoute';
import api, {
  setAuthToken,
  onAuthChange,
  getMyProfile,
  loginUser,
  logoutUser,
  registerUser,
  createProfile,
  getProducts,          // Legacy - kept for backward compatibility
  getAllProducts,       // Get all posts from all users (for Marketplace)
  getMyProducts,        // Get posts for current user only (for Profile/Dashboard)
  createProduct,
  updateProduct,
  deleteProduct,
  getChatRooms,         // MULTI-USER: Get chat rooms via API
  createChatRoom,       // MULTI-USER: Create or get chat room
} from './apiServer'; // แก้ไข Path
import { Recycle } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
// import { generateMockPosts } from './mockData'; // DISABLED: No mock data fallback
import { useNotifications } from './hooks/useNotifications';
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt';
import { findChatRoomBetweenUsers } from './utils/chatUtils';

export type UserRole = 'user' | 'admin' | 'seller';

// แก้ไข: เพิ่ม 'export'
export interface User {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  farmName?: string;
  location?: { lat: number; lng: number };
  verified?: boolean;
  avatar?: string;
}

// แก้ไข: เพิ่ม 'export' และเปลี่ยน 'location'
export interface Post {
  id: string;
  userId: string;
  title: string;
  animalType: string;
  wasteType: string;
  quantity: number;
  price: number;
  unit: string;
  location: { lat: number; lng: number }; // <-- แก้ไข
  address: string; // <-- เพิ่ม
  distance: number;
  verified: boolean;
  npk: { n: number; p: number; k: number };
  feedType: string;
  description: string;
  images: string[];
  farmName: string;
  contactPhone: string;
  rating: number;
  reviewCount: number;
  createdDate: string;
  sold?: boolean;
}

// MULTI-USER: ChatRoom and Message interfaces are now in chatService.ts
// Removed from here to avoid duplication

// Centralized Google Maps loader - only ONE instance in the entire app
const libraries: ("places")[] = ["places"];

export default function App() {
  // Centralized Google Maps API loader - ONLY ONE instance in the entire app
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });
  

  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [user, setUser] = useState<User | null>(null);
  // Separate state for all posts (Marketplace) and user's own posts (Profile/Dashboard)
  const [allPosts, setAllPosts] = useState<Post[]>([]);  // All posts from all users (for Marketplace)
  const [myPosts, setMyPosts] = useState<Post[]>([]);    // Current user's posts only (for Profile/Dashboard)
  // MULTI-USER: Chat rooms and messages managed via API
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({});
  const [confirmedChatRooms, setConfirmedChatRooms] = useState<Set<string>>(new Set());
  
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [chatPostId, setChatPostId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Push Notifications Setup
  const handleNotificationReceived = useCallback((payload: any) => {
    console.log('📨 Notification received in foreground:', payload);
    
    // If notification has chatId, navigate to that chat room
    if (payload.data?.chatId) {
      const chatId = payload.data.chatId;
      setSelectedRoomId(chatId);
      setCurrentPage('chat');
    }
  }, []);

  const {
    isSupported: isNotificationSupported,
    isPermissionGranted: isNotificationPermissionGranted,
    isInitialized: isNotificationInitialized,
    error: notificationError,
    requestPermission: requestNotificationPermission,
    initialize: initializeNotifications,
    cleanup: cleanupNotifications,
  } = useNotifications(handleNotificationReceived);

  /**
   * Fetch all data for the current user
   * This function separates:
   * - allPosts: All posts from all users (for Marketplace)
   * - myPosts: Only current user's posts (for Profile/Dashboard)
   * - chatRooms: Chat rooms where current user is buyer or seller
   */
  const fetchAllData = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      
      // Fetch data in parallel for better performance
      // 1. Get all posts from all users (for Marketplace)
      // 2. Get current user's posts only (for Profile/Dashboard)
      // 3. Get chat rooms for current user (via API)
      const [allProductsResponse, myProductsResponse, chatRoomsResponse] = await Promise.all([
        getAllProducts(),    // Get ALL posts from ALL users (Marketplace)
        getMyProducts(),     // Get ONLY current user's posts (Profile/Dashboard)
        getChatRooms(),      // MULTI-USER: Get chat rooms via API (prevents Firestore permission errors)
      ]);
      
      let fetchedAllPosts = allProductsResponse.data.data || [];
      let fetchedMyPosts = myProductsResponse.data.data || [];
      
      // CRITICAL: NO MOCK DATA FALLBACK - Only use real backend data
      // Mock data should only be used in explicit mock mode (not implemented here)
      
      // Set state separately for multi-user support
      setAllPosts(fetchedAllPosts);  // All posts for Marketplace
      setMyPosts(fetchedMyPosts);     // User's own posts for Profile/Dashboard
      setChatRooms(chatRoomsResponse.data.data || []);  // MULTI-USER: Chat rooms via API
      
      console.log(`✅ Fetched ${fetchedAllPosts.length} all posts and ${fetchedMyPosts.length} user posts for user ${user.id}`);
    } catch (err: any) {
      console.error("❌ Failed to fetch data:", err);
      
      // CRITICAL: DO NOT use mock data as fallback
      // Show proper error message instead
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.error || 
                          err?.message || 
                          'ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อกับเซิร์ฟเวอร์';
      
      setError(errorMessage);
      
      // Clear data instead of using mock fallback
      setAllPosts([]);
      setMyPosts([]);
      setChatRooms([]);
      
      // Log detailed error for debugging
      if (err?.response) {
        console.error('❌ API Error:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          url: err.config?.url,
        });
      } else if (err?.request) {
        console.error('❌ Network Error: Backend server is not responding');
        console.error('   Check if backend is running on http://localhost:8000');
        setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่');
      } else {
        console.error('❌ Request Error:', err.message);
      }
    }
  }, [user]);

  /**
   * MULTI-USER AUTHENTICATION:
   * - ใช้ onAuthStateChanged เพื่อตรวจสอบ auth state แบบ real-time
   * - ถ้า login สำเร็จ → ดึงข้อมูลโปรไฟล์จาก Firestore
   * - ถ้ายังไม่มีโปรไฟล์ → สร้างอัตโนมัติ (auto-create profile)
   * - ถ้า logout → ล้างข้อมูลและ redirect ไปหน้า landing
   * - CRITICAL: เมื่อ app เริ่มต้นครั้งแรก ให้เริ่มที่หน้า landing เสมอ
   */
  useEffect(() => {
    let isInitialMount = true; // Track if this is the first mount
    
    const unsubscribe = onAuthChange(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Get Firebase ID token
          const token = await firebaseUser.getIdToken();
          setAuthToken(token);
          
          // Try to get user profile from Firestore
          try {
            const response = await getMyProfile();
            setUser(response.data.user);
            
            // CRITICAL: เมื่อ app เริ่มต้นครั้งแรก (initial mount) ให้อยู่ที่หน้า landing
            // ไม่ redirect ไปหน้า profile อัตโนมัติ
            // User จะต้องกดปุ่มหรือ navigate เอง
            if (!isInitialMount) {
              // ถ้าไม่ใช่ initial mount (เช่น login ใหม่) → redirect ไป profile
              setCurrentPage('profile');
            } else {
              // ถ้าเป็น initial mount → อยู่ที่หน้า landing
              console.log("🚀 App initialized - staying on landing page");
              setCurrentPage('landing');
            }
          } catch (profileError: any) {
            console.error("❌ Profile fetch error:", profileError.response?.status, profileError.response?.data);
            
            // Check if it's a network/server error (backend down)
            const isServerError = !profileError.response || 
                                 profileError.response?.status >= 500 ||
                                 profileError.code === 'ECONNREFUSED' ||
                                 profileError.code === 'ERR_NETWORK' ||
                                 profileError.message?.includes('Network Error');
            
            if (isServerError) {
              // Backend is down - show error but don't clear user
              console.error("❌ Backend server is not available");
              const errorMsg = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่ที่ http://localhost:8000';
              setError(errorMsg);
              // Keep Firebase auth state but don't set user profile
              // User will see error message instead of mock data
              setUser(null);
              setAuthToken(null);
              return;
            }
            
            // Check if profile doesn't exist (404) or user not found
            const isNotFoundError = profileError.response?.status === 404 || 
                                   (profileError.response?.data && 
                                    (profileError.response.data.code === 'USER_NOT_FOUND' ||
                                     profileError.response.data.message?.includes('not found')));
            
            if (isNotFoundError) {
              // AUTO-CREATE PROFILE: Create user profile automatically if it doesn't exist
              console.log("📝 User profile not found, creating automatically...");
              try {
                const defaultProfile = {
                  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'ผู้ใช้',
                  farmName: '',
                  role: 'user' as const,
                };
                const createResponse = await createProfile(defaultProfile);
                setUser(createResponse.data.user);
                
                // CRITICAL: เมื่อ app เริ่มต้นครั้งแรก ให้อยู่ที่หน้า landing
                if (!isInitialMount) {
                  setCurrentPage('profile');
                } else {
                  setCurrentPage('landing');
                }
                console.log("✅ User profile created automatically");
              } catch (createError: any) {
                console.error("❌ Failed to create profile:", createError.response?.status, createError.response?.data);
                const errorMsg = createError.response?.data?.message || 
                               createError.message || 
                               'ไม่สามารถสร้างโปรไฟล์ได้';
                setError(errorMsg);
                setUser(null);
                setAuthToken(null);
              }
            } else {
              // Other errors (401 unauthorized, etc.)
              console.error("❌ Auth error:", profileError.response?.status, profileError.response?.data);
              const errorMsg = profileError.response?.data?.message || 
                             profileError.response?.data?.error || 
                             profileError.message || 
                             'เกิดข้อผิดพลาดในการโหลดโปรไฟล์';
              setError(errorMsg);
              // CRITICAL: DO NOT fallback to mock user - show error instead
              setUser(null);
              setAuthToken(null);
            }
          }
        } catch (err: any) {
          console.error("Auth error:", err);
          setUser(null);
          setAuthToken(null);
        }
      } else {
        // User logged out
        setUser(null);
        setAllPosts([]);
        setMyPosts([]);
        setChatRooms([]);
        setChatMessages({});
        setAuthToken(null);
        setCurrentPage('landing');
        // Cleanup notifications
        cleanupNotifications();
      }
      
      // Mark that initial mount is complete
      if (isInitialMount) {
        isInitialMount = false;
      }
      
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
      // Initialize notifications when user is logged in
      if (isNotificationSupported && !isNotificationInitialized) {
        initializeNotifications().catch(err => {
          console.error('Failed to initialize notifications:', err);
        });
      }
    }
  }, [user, fetchAllData, isNotificationSupported, isNotificationInitialized, initializeNotifications]);

  // Handle URL parameters for notification clicks (e.g., /chat?roomId=xxx)
  useEffect(() => {
    if (user && currentPage === 'chat') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomIdFromUrl = urlParams.get('roomId');
      if (roomIdFromUrl && roomIdFromUrl !== selectedRoomId) {
        setSelectedRoomId(roomIdFromUrl);
        // Clear URL parameter after reading
        window.history.replaceState({}, '', '/chat');
      }
    }
  }, [user, currentPage, selectedRoomId]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await loginUser(email, password);
      // After successful login, onAuthStateChanged will handle profile loading
      // and redirect to profile page (if not initial mount)
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error; // Re-throw to let LoginPage handle the error
    }
  };

  const handleRegister = async (
    email: string,
    password: string,
    profileData: { name: string; farmName?: string; role: 'user' | 'admin' }
  ) => {
    // 1. สร้าง User ใน Auth
    const userCredential = await registerUser(email, password);
    const token = await userCredential.user.getIdToken();
    setAuthToken(token);
    // 2. สร้างโปรไฟล์ใน DB (POST /api/users/profile)
    const response = await createProfile(profileData);
    // 3. ตั้งค่า User ใน React
    setUser(response.data.user);
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setAllPosts([]);      // Clear all posts
    setMyPosts([]);       // Clear user's posts
    setChatRooms([]);
    setChatMessages({});
    setAuthToken(null);
    setCurrentPage('landing');
  };

  // Called when child components update the user profile (e.g., ProfilePage)
  const handleUserUpdate = async (updatedUser: any) => {
    try {
      // Update local user state immediately
      setUser(updatedUser);
      // Refresh data that depends on user (myPosts, chatRooms)
      await fetchAllData();
    } catch (err) {
      console.error('Failed to handle user update:', err);
    }
  };

  const navigateTo = (page: string) => {
    setCurrentPage(page);
    if (page !== 'create-post') {
      setSelectedPostId(null);
    }
    if (page !== 'create-post') {
      setIsEditingPost(false);
    }
  };

  const handleViewPostDetail = (postId: string) => {
    setSelectedPostId(postId);
    setCurrentPage('post-detail');
  };

  const handleEditPost = (postId: string) => {
    setSelectedPostId(postId);
    setIsEditingPost(true);
    setCurrentPage('create-post');
  };

  const handleCreatePost = async (newPost: Omit<Post, 'id' | 'userId' | 'createdDate' | 'rating' | 'reviewCount'>) => {
    try {
      await createProduct(newPost);
      await fetchAllData();
      navigateTo('marketplace');
    } catch (err: any) {
      console.error("Failed to create post:", err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || "ไม่สามารถสร้างโพสต์ได้";
      console.error("Error details:", err?.response?.data);
      setError(errorMessage);
      alert(`เกิดข้อผิดพลาด: ${errorMessage}`);
    }
  };

  const handleUpdatePost = async (postId: string, updatedData: Partial<Post>) => {
    try {
      await updateProduct(postId, updatedData);
      await fetchAllData();
      setSelectedPostId(null);
      setIsEditingPost(false);
      navigateTo('marketplace');
    } catch (err) {
      console.error("Failed to update post:", err);
      setError("ไม่สามารถอัปเดตโพสต์ได้");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteProduct(postId);
      await fetchAllData();
      navigateTo('marketplace');
    } catch (err) {
      console.error("Failed to delete post:", err);
      setError("ไม่สามารถลบโพสต์ได้");
    }
  };

  /**
   * Handle opening chat from a post
   * MULTI-USER: Uses currentUser.uid to create/find chat room
   * Creates unique chat room ID based on participants
   */
  const handleOpenChat = async (postId: string) => {
    try {
      // MULTI-USER: Use currentUser.uid (not hardcoded or dummy user)
      if (!user || !user.id || !user.uid) {
        alert('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      // Check if this is a mock product
      const post = allPosts.find(p => p.id === postId);
      const isMockProduct = post && postId.startsWith('mock-post-');
      
      if (isMockProduct && post) {
        // For mock products, just navigate to chat page
        // ChatPage will handle real-time chat room creation
        navigateTo('chat');
        console.log(`💬 Opening chat for mock product ${postId}`);
      } else {
        // Real product - check if chat room already exists before creating
        const currentUserId = String(user.uid || user.id);
        const sellerId = String(post?.userId || '');
        
        // CRITICAL: Check if a chat room already exists between current user and seller
        // This prevents creating duplicate rooms (ONE room per user pair)
        const existingRoom = findChatRoomBetweenUsers(chatRooms, currentUserId, sellerId);
        
        if (existingRoom) {
          // Room already exists, use it
          console.log(`✅ Found existing chat room: ${existingRoom.id} between ${currentUserId} and ${sellerId}`);
          setSelectedRoomId(existingRoom.id);
          navigateTo('chat');
          return;
        }
        
        // No existing room found, create or get chat room via API
        // MULTI-USER: API will find existing room or create new one (ONE room per user pair)
        const response = await createChatRoom(postId);
        const room = response.data.data;
        
        // Add room to state if not exists
        if (!chatRooms.find(r => r.id === room.id)) {
          setChatRooms(prev => [...prev, room]);
        }
        
        // Navigate to chat with room ID
        setSelectedRoomId(room.id);
        navigateTo('chat');
        console.log(`💬 Opened chat room ${room.id} for product ${postId}`);
      }
    } catch (err: any) {
      console.error("Failed to open chat:", err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || "ไม่สามารถเริ่มแชทได้";
      console.error("Error details:", err?.response?.data);
      setError(errorMessage);
      alert(`เกิดข้อผิดพลาด: ${errorMessage}`);
    }
  };
  
  const handleOpenChatDialog = (postId: string) => {
    setChatPostId(postId);
  };

  const handleCloseChat = () => {
    setChatPostId(null);
  };
  
  /**
   * Handle confirming a sale
   * Updates the post's sold status in both allPosts and myPosts
   */
  const handleConfirmSale = (postId: string, roomId: string) => {
    // Update in allPosts (for Marketplace view)
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, sold: true } : p));
    // Update in myPosts (for Profile/Dashboard view) if it's user's own post
    setMyPosts(prev => prev.map(p => p.id === postId ? { ...p, sold: true } : p));
    setConfirmedChatRooms(prev => new Set([...prev, roomId]));
  };

  /**
   * Handle canceling a chat
   * MULTI-USER: Chat rooms are managed by ChatPage, so we just clear the selection
   */
  const handleCancelChat = (roomId: string) => {
    setSelectedRoomId(null);
    setConfirmedChatRooms(prev => {
      const newSet = new Set(prev);
      newSet.delete(roomId);
      return newSet;
    });
  };

  /**
   * MULTI-USER AUTHENTICATION:
   * - ถ้ายังไม่ login → แสดงหน้า Login/Register/Landing เท่านั้น
   * - ถ้า login แล้ว → ใช้ PrivateRoute เพื่อป้องกันหน้าเว็บ
   */
  
  // Use allPosts for finding posts (since posts can be from any user)
  const currentPost = selectedPostId ? allPosts.find(p => p.id === selectedPostId) : null;
  const chatPost = chatPostId ? allPosts.find(p => p.id === chatPostId) : null;

  /**
   * AUTHENTICATION PROTECTION:
   * - ถ้ายังไม่ login → แสดง LandingPage, LoginPage, หรือ RegisterPage เท่านั้น
   * - ถ้า login แล้ว → แสดงหน้าเว็บที่ต้องการทั้งหมด
   */
  
  // ถ้ายังไม่ login → แสดงหน้า Landing/Login/Register เท่านั้น
  if (!user && !isLoading) {
    if (currentPage === 'landing') {
      return <LandingPage onGetStarted={() => navigateTo('login')} />;
    }
    if (currentPage === 'login') {
      return <LoginPage onLogin={handleLogin} onBack={() => navigateTo('landing')} onRegisterClick={() => navigateTo('register')} showBackButton={true} />;
    }
    if (currentPage === 'register') {
      return <RegisterPage onRegister={handleRegister} onBack={() => navigateTo('landing')} onLoginClick={() => navigateTo('login')} />;
    }
    // ถ้า currentPage ไม่ใช่ landing/login/register → redirect ไป landing
    return <LandingPage onGetStarted={() => navigateTo('login')} />;
  }

  // ถ้ากำลัง loading → แสดง loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  // ถ้า login แล้ว → แสดงหน้าเว็บทั้งหมด
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user!} onLogout={handleLogout} onNavigate={navigateTo} currentPage={currentPage} />
      
      <main className="pt-16">
        {/* Server Error Display - Show when backend is unavailable */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {error.includes('เซิร์ฟเวอร์') || error.includes('server') || error.includes('backend') 
                    ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' 
                    : 'เกิดข้อผิดพลาด'}
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
                {(error.includes('เซิร์ฟเวอร์') || error.includes('server') || error.includes('backend')) && (
                  <p className="mt-2 text-xs text-red-600">
                    กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่ที่ http://localhost:8000
                  </p>
                )}
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Close error"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {currentPage === 'dashboard' && (
          <Dashboard 
            user={user!} 
            onNavigate={navigateTo} 
            posts={myPosts}              // MULTI-USER: Show only current user's posts
            allPosts={allPosts}           // Show all posts for reference
            onViewDetail={handleViewPostDetail}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onChat={handleOpenChatDialog}
            isLoaded={isLoaded}
            loadError={loadError}
          />
        )}
        {currentPage === 'marketplace' && user!.role !== 'admin' && (
          <Marketplace 
            user={user!} 
            posts={allPosts}              // MULTI-USER: Show ALL posts from ALL users (Marketplace requirement)
            onViewDetail={handleViewPostDetail}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onChat={handleOpenChatDialog}
            chattingPostIds={new Set(chatRooms.map(room => room.postId || room.productId))}
          />
        )}
        {currentPage === 'create-post' && user!.role !== 'admin' && (
          <CreatePost 
            user={user!} 
            onBack={() => navigateTo('marketplace')}
            onCreate={handleCreatePost}
            onUpdate={handleUpdatePost}
            editingPost={isEditingPost && currentPost ? currentPost : undefined}
            isLoaded={isLoaded}
            loadError={loadError}
          />
        )}
        {currentPage === 'post-detail' && currentPost && (
          <PostDetail
            post={currentPost}
            onBack={() => navigateTo('marketplace')}
            onEdit={() => handleEditPost(currentPost.id)}
            onDelete={() => handleDeletePost(currentPost.id)}
            isMyPost={String(currentPost.userId) === String(user!.id || user!.uid)}
            onChat={() => handleOpenChat(currentPost.id)}
          />
        )}
        {currentPage === 'bookings' && user!.role !== 'admin' && <BookingPage user={user!} />}
        {currentPage === 'fertilizer-advisor' && user!.role !== 'admin' && (
          <FertilizerAdvisor 
            defaultTab="recommendation" 
            onTabChange={(tab) => {
              if (tab === 'calculator') {
                setCurrentPage('npk-calculator');
              } else {
                setCurrentPage('fertilizer-advisor');
              }
            }}
          />
        )}

        {currentPage === 'npk-calculator' && user!.role !== 'admin' && (
          <FertilizerAdvisor 
            defaultTab="calculator" 
            onTabChange={(tab) => {
              if (tab === 'recommendation') {
                setCurrentPage('fertilizer-advisor');
              } else {
                setCurrentPage('npk-calculator');
              }
            }}
          />
        )}

        {currentPage === 'circular-view' && user!.role !== 'admin' && (
          <CircularEconomy />
        )}
        {currentPage === 'admin' && user!.role === 'admin' && <AdminPanel />}
        {currentPage === 'chat' && user!.role !== 'admin' && (
          <>
            {/* Notification Permission Prompt */}
            {isNotificationSupported && (
              <NotificationPermissionPrompt
                onRequestPermission={requestNotificationPermission}
                isSupported={isNotificationSupported}
                isPermissionGranted={isNotificationPermissionGranted}
                error={notificationError}
              />
            )}
            <ChatPage 
              user={user!} 
              chatRooms={chatRooms}        // MULTI-USER: Chat rooms from API
              posts={allPosts}              // MULTI-USER: Use allPosts to find post details
              confirmedRoomIds={confirmedChatRooms}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              onBack={() => navigateTo('dashboard')} 
              onConfirmSale={handleConfirmSale}
              initialRoomId={selectedRoomId}
              onCancelChat={handleCancelChat}
            />
          </>
        )}
        {currentPage === 'profile' && user!.role !== 'admin' && (
          <ProfilePage 
            user={user!} 
            posts={myPosts}              // MULTI-USER: Show only current user's posts in Profile
            onViewDetail={handleViewPostDetail}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onUpdateUser={handleUserUpdate}
          />
        )}
        
        {chatPost && (
          <ChatDialog 
            post={chatPost}
            currentUser={user!}
            onClose={handleCloseChat}
            onConfirm={() => handleOpenChat(chatPost.id)}
          />
        )}
        </main>
      </div>
  );
}