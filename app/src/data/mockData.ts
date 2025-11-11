/**
 * Mock data for Flix platform
 * Replace with actual API calls in production
 */

export interface Creator {
  id: string;
  name: string;
  avatar: string;
  subscribers: number;
  verified: boolean;
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  creator: Creator;
  views: number;
  duration: string;
  uploadedAt: string;
  price: number;
}

export const mockCreators: Creator[] = [
  {
    id: '1',
    name: 'Tech Explorer',
    avatar: 'https://i.pravatar.cc/150?img=1',
    subscribers: 1240000,
    verified: true,
  },
  {
    id: '2',
    name: 'Code Master',
    avatar: 'https://i.pravatar.cc/150?img=2',
    subscribers: 856000,
    verified: true,
  },
  {
    id: '3',
    name: 'Design Guru',
    avatar: 'https://i.pravatar.cc/150?img=3',
    subscribers: 523000,
    verified: false,
  },
];

export const mockVideos: Video[] = [
  {
    id: 'video_1',
    title: 'Building the Future of Web3 - Complete Guide to Solana Development',
    thumbnail: 'https://picsum.photos/seed/video1/640/360',
    creator: mockCreators[0],
    views: 245000,
    duration: '24:15',
    uploadedAt: '2 days ago',
    price: 2.99,
  },
  {
    id: 'video_2',
    title: 'Advanced React Patterns You Need to Know in 2024',
    thumbnail: 'https://picsum.photos/seed/video2/640/360',
    creator: mockCreators[1],
    views: 189000,
    duration: '18:42',
    uploadedAt: '5 days ago',
    price: 1.99,
  },
  {
    id: 'video_3',
    title: 'UI/UX Design Masterclass - From Concept to Production',
    thumbnail: 'https://picsum.photos/seed/video3/640/360',
    creator: mockCreators[2],
    views: 127000,
    duration: '32:08',
    uploadedAt: '1 week ago',
    price: 4.99,
  },
  {
    id: 'video_4',
    title: 'Blockchain Fundamentals: Understanding Decentralized Systems',
    thumbnail: 'https://picsum.photos/seed/video4/640/360',
    creator: mockCreators[0],
    views: 98000,
    duration: '15:33',
    uploadedAt: '3 days ago',
    price: 2.49,
  },
  {
    id: 'video_5',
    title: 'Next.js 14 Complete Course - Server Actions & More',
    thumbnail: 'https://picsum.photos/seed/video5/640/360',
    creator: mockCreators[1],
    views: 342000,
    duration: '41:22',
    uploadedAt: '1 day ago',
    price: 5.99,
  },
  {
    id: 'video_6',
    title: 'Figma to Code: Professional Workflow Tips',
    thumbnail: 'https://picsum.photos/seed/video6/640/360',
    creator: mockCreators[2],
    views: 76000,
    duration: '12:45',
    uploadedAt: '4 days ago',
    price: 1.49,
  },
];

export const mockAnalytics = {
  totalViews: 1250000,
  totalClicks: 487000,
  totalRevenue: 12450.75,
  revenueChange: +15.3,
  viewsChange: +23.1,
  clicksChange: -5.2,
  monthlyData: [
    { month: 'Jan', views: 120000, revenue: 1200 },
    { month: 'Feb', views: 150000, revenue: 1500 },
    { month: 'Mar', views: 180000, revenue: 1800 },
    { month: 'Apr', views: 210000, revenue: 2100 },
    { month: 'May', views: 240000, revenue: 2400 },
    { month: 'Jun', views: 280000, revenue: 2800 },
  ],
};
