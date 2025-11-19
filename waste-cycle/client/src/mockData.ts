import { Post } from './App';

// Mock images using Unsplash placeholder service
const getImageUrl = (seed: string, width: number = 800, height: number = 600) => {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
};

// Mock user IDs
const mockUserIds = [
  'mock-user-farm1',
  'mock-user-farm2',
  'mock-user-farm3',
  'mock-user-farm4',
  'mock-user-farm5',
  'mock-user-farm6',
  'mock-user-farm7',
  'mock-user-farm8',
];

// Mock booking/transaction data
export interface MockBooking {
  id: string;
  productId: string;
  productTitle: string;
  farmName: string;
  quantity: number;
  unit: string;
  price: number;
  totalPrice: number;
  bookingDate: string;
  deliveryDate?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  buyerId?: string;
  sellerId?: string;
}

// Generate mock completed deals for a user
export const generateMockBookings = (userId: string): { sold: MockBooking[], bought: MockBooking[] } => {
  const sold: MockBooking[] = [
    {
      id: 'booking-sold-1',
      productId: 'mock-post-4',
      productTitle: 'มูลหมูหมัก 800 กก.',
      farmName: 'ฟาร์มสุกรคุณภาพ',
      quantity: 800,
      unit: 'กก.',
      price: 18,
      totalPrice: 14400,
      bookingDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      deliveryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      buyerId: 'buyer-user-1',
      sellerId: userId,
    },
    {
      id: 'booking-sold-2',
      productId: 'mock-post-1',
      productTitle: 'มูลวัวแห้งคุณภาพดี 500 กก.',
      farmName: 'ฟาร์มโชคดี',
      quantity: 300,
      unit: 'กก.',
      price: 15,
      totalPrice: 4500,
      bookingDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      buyerId: 'buyer-user-2',
      sellerId: userId,
    },
    {
      id: 'booking-sold-3',
      productId: 'mock-post-2',
      productTitle: 'มูลไก่หมัก 1 ตัน',
      farmName: 'ฟาร์มเกษตรอินทรีย์',
      quantity: 500,
      unit: 'กก.',
      price: 12,
      totalPrice: 6000,
      bookingDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      deliveryDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      buyerId: 'buyer-user-3',
      sellerId: userId,
    },
  ];

  const bought: MockBooking[] = [
    {
      id: 'booking-bought-1',
      productId: 'mock-post-6',
      productTitle: 'มูลวัวสด 1,200 กก.',
      farmName: 'ฟาร์มโคนมเชียงใหม่',
      quantity: 600,
      unit: 'กก.',
      price: 10,
      totalPrice: 6000,
      bookingDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      deliveryDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      buyerId: userId,
      sellerId: mockUserIds[5],
    },
    {
      id: 'booking-bought-2',
      productId: 'mock-post-8',
      productTitle: 'มูลไก่ไข่แห้ง 600 กก.',
      farmName: 'ฟาร์มไก่ไข่แม่ริม',
      quantity: 400,
      unit: 'กก.',
      price: 14,
      totalPrice: 5600,
      bookingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      buyerId: userId,
      sellerId: mockUserIds[7],
    },
  ];

  return { sold, bought };
};

// Mock business connections/network
export interface MockConnection {
  id: string;
  name: string;
  farmName: string;
  avatar?: string;
  dealCount: number;
  totalValue: number;
  lastDealDate: string;
  rating: number;
}

export const generateMockConnections = (): MockConnection[] => {
  return [
    {
      id: 'conn-1',
      name: 'สมชาย ใจดี',
      farmName: 'ฟาร์มโคนมเชียงใหม่',
      dealCount: 5,
      totalValue: 28000,
      lastDealDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      rating: 4.8,
    },
    {
      id: 'conn-2',
      name: 'สมหญิง รักษ์ดิน',
      farmName: 'สวนผักปลอดสาร',
      dealCount: 3,
      totalValue: 15000,
      lastDealDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      rating: 4.5,
    },
    {
      id: 'conn-3',
      name: 'ประยุทธ์ เกษตรกร',
      farmName: 'ฟาร์มไก่ไข่แม่ริม',
      dealCount: 8,
      totalValue: 45000,
      lastDealDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      rating: 4.9,
    },
    {
      id: 'conn-4',
      name: 'วิชัย มั่งคั่ง',
      farmName: 'ฟาร์มสุกรคุณภาพ',
      dealCount: 2,
      totalValue: 12000,
      lastDealDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      rating: 4.6,
    },
    {
      id: 'conn-5',
      name: 'สุดา เจริญสุข',
      farmName: 'ฟาร์มเกษตรอินทรีย์',
      dealCount: 4,
      totalValue: 22000,
      lastDealDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      rating: 4.7,
    },
  ];
};

// Generate mock posts with real images
export const generateMockPosts = (currentUserId: string): Post[] => {
  const mockPosts: Post[] = [
    {
      id: 'mock-post-1',
      userId: mockUserIds[0],
      title: 'มูลวัวแห้งคุณภาพดี 500 กก.',
      animalType: 'cow',
      wasteType: 'animal',
      quantity: 500,
      price: 15,
      unit: 'kg',
      location: { lat: 18.7883, lng: 98.9853 },
      address: '123 ถนนเชียงใหม่-ลำปาง ตำบลสันป่าข่อย อำเภอเมือง จังหวัดเชียงใหม่ 50000',
      distance: 5.2,
      verified: true,
      npk: { n: 2.5, p: 1.8, k: 2.0 },
      feedType: 'หญ้าสด, อาหารเม็ด',
      description: 'มูลวัวแห้งคุณภาพดี ผ่านการหมักแล้ว พร้อมใช้งาน เก็บในที่ร่ม ไม่มีกลิ่นเหม็น เหมาะสำหรับทำปุ๋ยอินทรีย์',
      images: [
        getImageUrl('cow-manure-1'),
        getImageUrl('cow-manure-2'),
        getImageUrl('cow-manure-3'),
      ],
      farmName: 'ฟาร์มโชคดี',
      contactPhone: '081-234-5678',
      rating: 4.5,
      reviewCount: 12,
      createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      sold: false,
    },
    {
      id: 'mock-post-2',
      userId: mockUserIds[1],
      title: 'มูลไก่หมัก 1 ตัน',
      animalType: 'chicken',
      wasteType: 'animal',
      quantity: 1000,
      price: 12,
      unit: 'kg',
      location: { lat: 18.7950, lng: 98.9980 },
      address: '456 หมู่ 5 ตำบลหนองป่าครั่ง อำเภอสันทราย จังหวัดเชียงใหม่ 50210',
      distance: 8.5,
      verified: true,
      npk: { n: 3.2, p: 2.5, k: 1.8 },
      feedType: 'อาหารเม็ด, ข้าวโพด',
      description: 'มูลไก่หมักคุณภาพสูง ผ่านกระบวนการหมักอย่างถูกต้อง มีธาตุอาหารครบถ้วน เหมาะสำหรับพืชผักทุกชนิด',
      images: [
        getImageUrl('chicken-manure-1'),
        getImageUrl('chicken-manure-2'),
      ],
      farmName: 'ฟาร์มเกษตรอินทรีย์',
      contactPhone: '082-345-6789',
      rating: 4.8,
      reviewCount: 25,
      createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      sold: false,
    },
    {
      id: 'mock-post-3',
      userId: mockUserIds[2],
      title: 'เศษพืชผักสลัด 200 กก.',
      animalType: '',
      wasteType: 'plant',
      quantity: 200,
      price: 8,
      unit: 'kg',
      location: { lat: 18.7800, lng: 98.9700 },
      address: '789 ถนนลำปาง-เชียงใหม่ ตำบลป่าแดด อำเภอแม่ริม จังหวัดเชียงใหม่ 50180',
      distance: 12.3,
      verified: false,
      npk: { n: 1.5, p: 0.8, k: 2.5 },
      feedType: '',
      description: 'เศษพืชจากแปลงผักสลัด สดใหม่ ยังไม่เน่าเสีย เหมาะสำหรับทำปุ๋ยหมักหรืออาหารสัตว์',
      images: [
        getImageUrl('plant-waste-1'),
        getImageUrl('plant-waste-2'),
        getImageUrl('plant-waste-3'),
        getImageUrl('plant-waste-4'),
      ],
      farmName: 'สวนผักปลอดสาร',
      contactPhone: '083-456-7890',
      rating: 4.2,
      reviewCount: 8,
      createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      sold: false,
    },
    {
      id: 'mock-post-4',
      userId: mockUserIds[3],
      title: 'มูลหมูหมัก 800 กก.',
      animalType: 'pig',
      wasteType: 'animal',
      quantity: 800,
      price: 18,
      unit: 'kg',
      location: { lat: 18.8000, lng: 99.0100 },
      address: '321 หมู่ 3 ตำบลสันพระเนตร อำเภอสันป่าตอง จังหวัดเชียงใหม่ 50120',
      distance: 15.8,
      verified: true,
      npk: { n: 2.8, p: 2.2, k: 1.5 },
      feedType: 'อาหารหมูสำเร็จรูป',
      description: 'มูลหมูหมักคุณภาพดี ผ่านการบำบัดแล้ว ไม่มีกลิ่นเหม็น มีธาตุอาหารสูง เหมาะสำหรับทำปุ๋ย',
      images: [
        getImageUrl('pig-manure-1'),
        getImageUrl('pig-manure-2'),
      ],
      farmName: 'ฟาร์มสุกรคุณภาพ',
      contactPhone: '084-567-8901',
      rating: 4.6,
      reviewCount: 18,
      createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      sold: true,
    },
    {
      id: 'mock-post-5',
      userId: mockUserIds[4],
      title: 'เศษอาหารจากโรงแรม 300 กก.',
      animalType: '',
      wasteType: 'food',
      quantity: 300,
      price: 5,
      unit: 'kg',
      location: { lat: 18.7900, lng: 98.9900 },
      address: '555 ถนนนิมมานเหมินทร์ ตำบลสุเทพ อำเภอเมือง จังหวัดเชียงใหม่ 50200',
      distance: 3.5,
      verified: false,
      npk: { n: 1.2, p: 0.5, k: 0.8 },
      feedType: '',
      description: 'เศษอาหารจากโรงแรม ผ่านการคัดแยกแล้ว ไม่มีพลาสติกหรือของมีคม เหมาะสำหรับทำปุ๋ยหมัก',
      images: [
        getImageUrl('food-waste-1'),
        getImageUrl('food-waste-2'),
        getImageUrl('food-waste-3'),
      ],
      farmName: 'โรงแรมรีสอร์ท',
      contactPhone: '085-678-9012',
      rating: 3.9,
      reviewCount: 5,
      createdDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      sold: false,
    },
    {
      id: 'mock-post-6',
      userId: mockUserIds[5],
      title: 'มูลวัวสด 1,200 กก.',
      animalType: 'cow',
      wasteType: 'animal',
      quantity: 1200,
      price: 10,
      unit: 'kg',
      location: { lat: 18.7700, lng: 98.9600 },
      address: '888 หมู่ 8 ตำบลแม่เหียะ อำเภอเมือง จังหวัดเชียงใหม่ 50100',
      distance: 18.2,
      verified: true,
      npk: { n: 2.0, p: 1.5, k: 1.8 },
      feedType: 'หญ้าสด, ฟางข้าว',
      description: 'มูลวัวสดใหม่ทุกวัน จากฟาร์มวัวนมคุณภาพ มีธาตุอาหารสูง เหมาะสำหรับทำปุ๋ยหมักหรือใช้โดยตรง',
      images: [
        getImageUrl('cow-fresh-1'),
        getImageUrl('cow-fresh-2'),
        getImageUrl('cow-fresh-3'),
        getImageUrl('cow-fresh-4'),
        getImageUrl('cow-fresh-5'),
      ],
      farmName: 'ฟาร์มโคนมเชียงใหม่',
      contactPhone: '086-789-0123',
      rating: 4.7,
      reviewCount: 32,
      createdDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      sold: false,
    },
    {
      id: 'mock-post-7',
      userId: mockUserIds[6],
      title: 'เศษใบไม้และกิ่งไม้ 500 กก.',
      animalType: '',
      wasteType: 'plant',
      quantity: 500,
      price: 6,
      unit: 'kg',
      location: { lat: 18.8100, lng: 99.0200 },
      address: '999 หมู่ 9 ตำบลสันทรายน้อย อำเภอสันทราย จังหวัดเชียงใหม่ 50210',
      distance: 22.5,
      verified: false,
      npk: { n: 1.0, p: 0.3, k: 0.5 },
      feedType: '',
      description: 'เศษใบไม้และกิ่งไม้จากการตัดแต่งสวน ผ่านการบดแล้ว เหมาะสำหรับทำปุ๋ยหมักหรือคลุมดิน',
      images: [
        getImageUrl('leaf-waste-1'),
        getImageUrl('leaf-waste-2'),
      ],
      farmName: 'สวนไม้ประดับ',
      contactPhone: '087-890-1234',
      rating: 4.0,
      reviewCount: 7,
      createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      sold: false,
    },
    {
      id: 'mock-post-8',
      userId: mockUserIds[7],
      title: 'มูลไก่ไข่แห้ง 600 กก.',
      animalType: 'chicken',
      wasteType: 'animal',
      quantity: 600,
      price: 14,
      unit: 'kg',
      location: { lat: 18.7850, lng: 98.9750 },
      address: '111 หมู่ 1 ตำบลป่าแดด อำเภอแม่ริม จังหวัดเชียงใหม่ 50180',
      distance: 9.8,
      verified: true,
      npk: { n: 3.0, p: 2.3, k: 2.0 },
      feedType: 'อาหารไก่ไข่สำเร็จรูป',
      description: 'มูลไก่ไข่แห้งคุณภาพดี ผ่านการตากแห้งแล้ว ไม่มีกลิ่นเหม็น มีธาตุอาหารสูงมาก',
      images: [
        getImageUrl('chicken-dry-1'),
        getImageUrl('chicken-dry-2'),
        getImageUrl('chicken-dry-3'),
      ],
      farmName: 'ฟาร์มไก่ไข่แม่ริม',
      contactPhone: '088-901-2345',
      rating: 4.9,
      reviewCount: 45,
      createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      sold: false,
    },
  ];

  // Filter out posts from current user to show only other people's posts in marketplace
  return mockPosts.filter(post => post.userId !== currentUserId);
};

