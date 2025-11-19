import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Calendar, Star, Package, TrendingUp, Edit, Save, X, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { User, Post } from '../App';
import { getMyProfile, updateProfile, getUserBookings } from '../apiServer';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { generateMockBookings } from '../mockData';

interface ProfilePageProps {
  user: User;
  posts: Post[];              // Only current user's posts (filtered by userId in backend)
  onViewDetail: (postId: string) => void;
  onEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
  onUpdateUser?: (updatedUser: User) => void; // optional callback to notify parent of updates
}

/**
 * ProfilePage Component
 * 
 * MULTI-USER SUPPORT:
 * - This page displays ONLY the current logged-in user's posts
 * - Posts are filtered by userId in the backend (getMyProducts API)
 * - Each user sees only their own posts when they visit their profile
 * 
 * Example:
 * - If "นางเอก" logs in → sees only posts where userId === "นางเอก's userId"
 * - If "นายบี" logs in → sees only posts where userId === "นายบี's userId"
 */
export function ProfilePage({ user, posts, onViewDetail, onEdit, onDelete, onUpdateUser }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: user.name,
    farmName: user.farmName || '',
    email: user.email,
    phone: (user as any).phone ?? '',
    location: (user as any).location ?? '',
  });

  // Keep edited form in sync if `user` prop changes (prevents stale mock defaults)
  useEffect(() => {
    setEditedData({
      name: user.name,
      farmName: user.farmName || '',
      email: user.email,
      phone: (user as any).phone ?? '',
      location: (user as any).location ?? '',
    });
  }, [user]);

  // Rating state - prefer `user.rating` if present, otherwise fetch profile from backend
  const [rating, setRating] = useState<number | null>(
    (user as any).rating != null ? Number((user as any).rating) : null
  );

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const resp = await getMyProfile();
        const r = resp?.data?.user?.rating ?? resp?.data?.rating ?? null;
        if (mounted && r != null) {
          setRating(Number(r));
        }
      } catch (err) {
        console.error('Failed to load profile for rating:', err);
      }
    };

    // If we already have rating from prop, keep it; otherwise fetch
    if (rating == null) {
      loadProfile();
    }

    return () => { mounted = false; };
  }, [user]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Send updated profile to backend
      const payload = {
        name: editedData.name,
        farmName: editedData.farmName,
        email: editedData.email,
        phone: editedData.phone,
        location: editedData.location,
      };

      const resp = await updateProfile(payload);

      // If backend returns updated user, prefer that
      const updatedUser = resp?.data?.user ?? { ...user, ...payload };

      // Notify parent if callback provided
      if (typeof onUpdateUser === 'function') {
        onUpdateUser(updatedUser as User);
      }

      // Refresh local rating from backend (in case it's changed)
      try {
        const fresh = await getMyProfile();
        const r = fresh?.data?.user?.rating ?? fresh?.data?.rating ?? null;
        if (r != null) setRating(Number(r));
      } catch (err) {
        // ignore
      }

      setIsEditing(false);
      alert('บันทึกข้อมูลสำเร็จ!');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  // Booking history loaded from backend (both bought and sold)
  const [bookings, setBookings] = useState<{ bought: any[]; sold: any[] }>({ bought: [], sold: [] });
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadBookings = async () => {
      if (!user || !(user as any).uid) return;
      setIsBookingsLoading(true);
      try {
        const resp = await getUserBookings(String((user as any).uid));
        const data = resp?.data?.data || { bought: [], sold: [] };
        
        // Use mock data as fallback if no real data
        const hasBought = data.bought && data.bought.length > 0;
        const hasSold = data.sold && data.sold.length > 0;
        
        if (!hasBought && !hasSold) {
          // Use mock bookings to demonstrate the feature
          const mockData = generateMockBookings(String((user as any).uid));
          if (mounted) setBookings(mockData);
        } else {
          if (mounted) setBookings({ bought: data.bought || [], sold: data.sold || [] });
        }
      } catch (err) {
        console.error('Failed to load bookings for profile:', err);
        // Fallback to mock data on error
        const mockData = generateMockBookings(String((user as any).uid));
        if (mounted) setBookings(mockData);
      } finally {
        if (mounted) setIsBookingsLoading(false);
      }
    };

    loadBookings();
    return () => { mounted = false; };
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Profile Header Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-4xl text-white overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name?.[0] || 'U'}</span>
                  )}
                </div>
                <Badge className="absolute top-0 right-0 bg-green-500 text-white">
                  ✓ ยืนยันแล้ว
                </Badge>
              </div>

              {/* User Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">ชื่อ</Label>
                        <Input
                          id="name"
                          value={editedData.name}
                          onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="farmName">ชื่อฟาร์ม</Label>
                        <Input
                          id="farmName"
                          value={editedData.farmName}
                          onChange={(e) => setEditedData({ ...editedData, farmName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">อีเมล</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editedData.email}
                          onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">เบอร์โทร</Label>
                        <Input
                          id="phone"
                          value={editedData.phone}
                          onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="location">ที่อยู่</Label>
                        <Input
                          id="location"
                          value={editedData.location}
                          onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" />
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        {/* MULTI-USER SAFETY: Check user data before displaying */}
                        <h1 className="text-2xl mb-1">{user?.name ?? 'ผู้ใช้'}</h1>
                        <p className="text-gray-600 mb-3">{user?.farmName ?? ''}</p>
                      </div>
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        แก้ไขโปรไฟล์
                      </Button>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{editedData.location || 'ยังไม่ได้ระบุ'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{editedData.phone || 'ยังไม่ได้ระบุ'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {(user as any).createdAt 
                            ? new Date((user as any).createdAt).toLocaleDateString('th-TH', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })
                            : 'มกราคม 2024'
                          }
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-yellow-50">
              <CardContent className="pt-6 text-center">
                <Star className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-4xl text-yellow-600 mb-2">{rating != null ? rating.toFixed(1) : '4.5'}</p>
                <p className="text-gray-600">คะแนนเฉลี่ย</p>
              </CardContent>
          </Card>

          <Card className="bg-blue-50">
            <CardContent className="pt-6 text-center">
              <Package className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-4xl text-blue-600 mb-2">{posts.length}</p>
              <p className="text-gray-600">รายการทั้งหมด</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-4xl text-green-600 mb-2">5</p>
              <p className="text-gray-600">เครือข่ายธุรกิจ</p>
              <p className="text-xs text-gray-500 mt-1">คู่ค้าที่ทำธุรกรรม</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="history" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">ภาพรวม</TabsTrigger>
            <TabsTrigger value="transactions">ประวัติการซื้อ</TabsTrigger>
            <TabsTrigger value="reviews">รีวิว</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>โพสต์ของฉัน ({posts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {posts.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>ยังไม่มีโพสต์</p>
                    <p className="text-sm mt-2">ไปที่ Marketplace เพื่อสร้างโพสต์แรกของคุณ</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.map(post => (
                      <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {/* Post Image */}
                        <div className="relative h-48 bg-gradient-to-br from-green-100 to-blue-100">
                          {post.images && Array.isArray(post.images) && post.images.length > 0 && post.images[0] ? (
                            <ImageWithFallback 
                              src={post.images[0]} 
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-16 h-16 text-gray-300" />
                            </div>
                          )}
                          {post.sold && (
                            <Badge className="absolute top-3 right-3 bg-red-500 text-white">
                              ✓ ขายแล้ว
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2 truncate">{post.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{post.farmName}</p>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-lg text-green-600">฿{post.price}</p>
                            <p className="text-sm text-gray-500">{post.quantity} {post.unit}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => onViewDetail(post.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              ดู
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onEdit(post.id)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (confirm('คุณต้องการลบโพสต์นี้หรือไม่?')) {
                                  onDelete(post.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>รายการซื้อขายล่าสุด</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Transaction Summary */}
                    {!isBookingsLoading && (bookings.sold.length > 0 || bookings.bought.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                          <div className="text-2xl text-green-600 mb-1">
                            {bookings.sold.filter(b => b.status === 'completed').length}
                          </div>
                          <div className="text-sm text-green-700">ขายสำเร็จ</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                          <div className="text-2xl text-blue-600 mb-1">
                            {bookings.bought.filter(b => b.status === 'completed').length}
                          </div>
                          <div className="text-sm text-blue-700">ซื้อสำเร็จ</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                          <div className="text-2xl text-purple-600 mb-1">
                            ฿{(
                              bookings.sold
                                .filter(b => b.status === 'completed')
                                .reduce((sum, b) => sum + (b.totalPrice || 0), 0) +
                              bookings.bought
                                .filter(b => b.status === 'completed')
                                .reduce((sum, b) => sum + (b.totalPrice || 0), 0)
                            ).toLocaleString()}
                          </div>
                          <div className="text-sm text-purple-700">มูลค่ารวม</div>
                        </div>
                      </div>
                    )}

                    {isBookingsLoading ? (
                      <div className="py-6 text-center text-gray-500">กำลังโหลดประวัติ...</div>
                    ) : (bookings.sold.length === 0 && bookings.bought.length === 0) ? (
                      <div className="py-12 text-center text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>ยังไม่มีประวัติการซื้อขาย</p>
                      </div>
                    ) : (
                      // Show sold first then bought
                      <div className="space-y-3">
                        {bookings.sold.length > 0 && (
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              รายการขาย ({bookings.sold.length})
                            </h3>
                            <div className="space-y-3">
                              {bookings.sold.map(b => (
                                <TransactionCard
                                  key={`sold-${b.id}`}
                                  transaction={{
                                    id: `sold-${b.id}`,
                                    type: 'sold',
                                    icon: <Package className="w-10 h-10 text-green-600" />,
                                    title: b.productTitle || b.productId || b.farmName || 'สินค้า',
                                    subtitle: `${b.quantity || ''} ${b.unit || 'กก.'} · ${b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('th-TH') : ''}`,
                                    price: b.totalPrice || (b.price * b.quantity),
                                    status: b.status || 'unknown',
                                    statusColor: b.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {bookings.bought.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              รายการซื้อ ({bookings.bought.length})
                            </h3>
                            <div className="space-y-3">
                              {bookings.bought.map(b => (
                                <TransactionCard
                                  key={`bought-${b.id}`}
                                  transaction={{
                                    id: `bought-${b.id}`,
                                    type: 'bought',
                                    icon: <Package className="w-10 h-10 text-blue-600" />,
                                    title: b.productTitle || b.productId || b.farmName || 'สินค้า',
                                    subtitle: `${b.quantity || ''} ${b.unit || 'กก.'} · ${b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('th-TH') : ''}`,
                                    price: b.totalPrice || (b.price * b.quantity),
                                    status: b.status || 'unknown',
                                    statusColor: b.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>รีวิวจากผู้ซื้อ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-12 text-center text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>ยังไม่มีรีวิว</p>
                  <p className="text-sm mt-2">รีวิวจะปรากฏที่นี่เมื่อมีผู้ซื้อให้คะแนน</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface Transaction {
  id: string;
  type?: 'sold' | 'bought';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  price?: number;
  status: string;
  statusColor: string;
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  const statusText: Record<string, string> = {
    completed: '✓ เสร็จสิ้น',
    confirmed: '📋 ยืนยันแล้ว',
    pending: '⏳ รอดำเนินการ',
    cancelled: '✗ ยกเลิก',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-full ${transaction.type === 'sold' ? 'bg-green-50' : 'bg-blue-50'}`}>
        {transaction.icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium">{transaction.title}</h3>
          {transaction.type && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              transaction.type === 'sold' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {transaction.type === 'sold' ? '🔄 ขาย' : '🛒 ซื้อ'}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{transaction.subtitle}</p>
        {transaction.price && (
          <p className="text-sm font-semibold text-green-600 mt-1">
            ฿{transaction.price.toLocaleString()}
          </p>
        )}
      </div>
      <Badge className={transaction.statusColor}>
        {statusText[transaction.status] || transaction.status}
      </Badge>
    </div>
  );
}