// ============================================
// FLIX BACKEND - TYPESCRIPT TYPES
// ============================================
// Type-safe interfaces for all Supabase entities

// ============================================
// USER TYPES
// ============================================

export type UserRole = 'creator' | 'viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  profile_image_url: string | null;
  wallet_address: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  profile_image_url: string | null;
  bio: string | null;
}

export interface CreateUserInput {
  username: string;
  email: string;
  role: UserRole;
  profile_image_url?: string;
  wallet_address?: string;
  bio?: string;
}

export interface UpdateUserInput {
  username?: string;
  profile_image_url?: string;
  wallet_address?: string;
  bio?: string;
}

// ============================================
// VIDEO TYPES
// ============================================

export interface Video {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string;
  duration: number; // in seconds
  price: number;
  views: number;
  clicks: number;
  is_promoted: boolean;
  category: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface VideoWithCreator extends Video {
  creator: UserProfile;
}

export interface CreateVideoInput {
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url: string;
  duration: number;
  price: number;
  category?: string;
  tags?: string[];
  is_promoted?: boolean;
}

export interface UpdateVideoInput {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  price?: number;
  category?: string;
  tags?: string[];
  is_promoted?: boolean;
}

// ============================================
// CREATOR STATS TYPES
// ============================================

export interface CreatorStats {
  creator_id: string;
  total_videos: number;
  total_views: number;
  total_clicks: number;
  total_revenue: number;
  updated_at: string;
}

export interface CreatorDashboard extends CreatorStats {
  recent_videos: VideoWithCreator[];
  recent_transactions: Transaction[];
}

// ============================================
// TRANSACTION TYPES
// ============================================

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'stripe' | 'solana' | 'usdc' | 'mock';

export interface Transaction {
  id: string;
  user_id: string;
  video_id: string;
  creator_id: string;
  amount: number;
  status: TransactionStatus;
  payment_method: PaymentMethod | null;
  transaction_hash: string | null;
  created_at: string;
}

export interface TransactionWithDetails extends Transaction {
  video: Video;
  creator: UserProfile;
}

export interface CreateTransactionInput {
  video_id: string;
  creator_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_hash?: string;
}

// ============================================
// VIDEO UNLOCK TYPES
// ============================================

export interface VideoUnlock {
  id: string;
  user_id: string;
  video_id: string;
  transaction_id: string | null;
  unlocked_at: string;
}

export interface UnlockedVideo extends VideoUnlock {
  video: VideoWithCreator;
}

// ============================================
// VIDEO VIEW TYPES
// ============================================

export interface VideoView {
  id: string;
  video_id: string;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  watched_duration: number | null;
  created_at: string;
}

export interface CreateVideoViewInput {
  video_id: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  watched_duration?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// QUERY FILTER TYPES
// ============================================

export interface VideoFilters {
  category?: string;
  creator_id?: string;
  min_price?: number;
  max_price?: number;
  is_promoted?: boolean;
  tags?: string[];
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: 'views' | 'created_at' | 'price' | 'title';
  order?: 'asc' | 'desc';
}

// ============================================
// STORAGE TYPES
// ============================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface VideoAnalytics {
  video_id: string;
  views: number;
  clicks: number;
  revenue: number;
  views_by_date: Record<string, number>;
  avg_watch_duration: number;
}

export interface CreatorAnalytics {
  total_videos: number;
  total_views: number;
  total_clicks: number;
  total_revenue: number;
  views_trend: Array<{ date: string; views: number }>;
  revenue_trend: Array<{ date: string; revenue: number }>;
  top_videos: VideoWithCreator[];
}

// ============================================
// DATABASE HELPER TYPES
// ============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: CreateUserInput;
        Update: UpdateUserInput;
      };
      videos: {
        Row: Video;
        Insert: CreateVideoInput;
        Update: UpdateVideoInput;
      };
      creator_stats: {
        Row: CreatorStats;
      };
      transactions: {
        Row: Transaction;
        Insert: CreateTransactionInput;
      };
      video_unlocks: {
        Row: VideoUnlock;
      };
      video_views: {
        Row: VideoView;
        Insert: CreateVideoViewInput;
      };
    };
  };
}
