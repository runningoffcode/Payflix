import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Video, Payment, VideoAccess } from '../types';

/**
 * Supabase Database Service
 * Persistent database using Supabase PostgreSQL
 */
class SupabaseDatabase {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('📦 Connected to Supabase database');
  }

  // Users
  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert([
        {
          wallet_address: user.walletAddress,
          username: user.username,
          email: user.email,
          is_creator: user.isCreator,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return this.mapUserFromDb(data);
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching user:', error);
      return null;
    }

    return this.mapUserFromDb(data);
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching user by wallet:', error);
      return null;
    }

    return this.mapUserFromDb(data);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const dbUpdates: any = {};
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.isCreator !== undefined) dbUpdates.is_creator = updates.isCreator;

    const { data, error } = await this.supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return this.mapUserFromDb(data);
  }

  // Videos
  async createVideo(video: Video): Promise<Video> {
    const { data, error } = await this.supabase
      .from('videos')
      .insert([
        {
          id: video.id,
          creator_id: video.creatorId,
          creator_wallet: video.creatorWallet,
          title: video.title,
          description: video.description,
          price_usdc: video.priceUsdc,
          thumbnail_url: video.thumbnailUrl,
          video_url: video.videoUrl,
          video_path: video.videoPath,
          duration: video.duration,
          views: video.views,
          earnings: video.earnings,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating video:', error);
      throw new Error(`Failed to create video: ${error.message}`);
    }

    return this.mapVideoFromDb(data);
  }

  async getVideoById(id: string): Promise<Video | null> {
    const { data, error } = await this.supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching video:', error);
      return null;
    }

    return this.mapVideoFromDb(data);
  }

  async getAllVideos(): Promise<Video[]> {
    const { data, error } = await this.supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
      return [];
    }

    console.log(`📊 Supabase query returned ${data?.length || 0} videos`);
    if (data && data.length > 0) {
      console.log('   Sample video:', data[0].title, '- Price:', data[0].price_usdc);
    }

    return data.map((v) => this.mapVideoFromDb(v));
  }

  async getVideosByCreator(creatorId: string): Promise<Video[]> {
    const { data, error } = await this.supabase
      .from('videos')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching creator videos:', error);
      return [];
    }

    return data.map((v) => this.mapVideoFromDb(v));
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.priceUsdc !== undefined) dbUpdates.price_usdc = updates.priceUsdc;
    if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;
    if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
    if (updates.videoPath !== undefined) dbUpdates.video_path = updates.videoPath;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.views !== undefined) dbUpdates.views = updates.views;
    if (updates.earnings !== undefined) dbUpdates.earnings = updates.earnings;

    const { data, error } = await this.supabase
      .from('videos')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating video:', error);
      return null;
    }

    return this.mapVideoFromDb(data);
  }

  async deleteVideo(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('videos').delete().eq('id', id);

    if (error) {
      console.error('Error deleting video:', error);
      return false;
    }

    return true;
  }

  async incrementVideoViews(videoId: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_video_views', {
      video_id: videoId,
    });

    if (error) {
      // Fallback to manual increment if RPC doesn't exist
      const video = await this.getVideoById(videoId);
      if (video) {
        await this.updateVideo(videoId, { views: video.views + 1 });
      }
    }
  }

  // Payments
  async createPayment(payment: Payment): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payments')
      .insert([
        {
          id: payment.id,
          video_id: payment.videoId,
          user_id: payment.userId,
          user_wallet: payment.userWallet,
          creator_wallet: payment.creatorWallet,
          amount: payment.amount,
          creator_amount: payment.creatorAmount,
          platform_amount: payment.platformAmount,
          transaction_signature: payment.transactionSignature,
          status: payment.status,
          verified_at: payment.verifiedAt,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }

    return this.mapPaymentFromDb(data);
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      return null;
    }

    return this.mapPaymentFromDb(data);
  }

  async getPaymentByTransaction(signature: string): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('transaction_signature', signature)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      return null;
    }

    return this.mapPaymentFromDb(data);
  }

  async getUserPaymentForVideo(userId: string, videoId: string): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .eq('status', 'verified')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      return null;
    }

    return this.mapPaymentFromDb(data);
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user payments:', error);
      return [];
    }

    return data.map((p) => this.mapPaymentFromDb(p));
  }

  async getPaymentsByVideo(videoId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching video payments:', error);
      return [];
    }

    return data.map((p) => this.mapPaymentFromDb(p));
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.verifiedAt !== undefined) dbUpdates.verified_at = updates.verifiedAt;

    const { data, error } = await this.supabase
      .from('payments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      return null;
    }

    return this.mapPaymentFromDb(data);
  }

  // Video Access
  async grantVideoAccess(access: VideoAccess): Promise<VideoAccess> {
    const { data, error } = await this.supabase
      .from('video_access')
      .insert([
        {
          user_id: access.userId,
          video_id: access.videoId,
          payment_id: access.paymentId,
          expires_at: access.expiresAt.toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error granting video access:', error);
      throw new Error(`Failed to grant video access: ${error.message}`);
    }

    return this.mapVideoAccessFromDb(data);
  }

  async hasVideoAccess(userId: string, videoId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('video_access')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // Not found
      return false;
    }

    return !!data;
  }

  async getVideoAccess(userId: string, videoId: string): Promise<VideoAccess | null> {
    const { data, error } = await this.supabase
      .from('video_access')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      return null;
    }

    return this.mapVideoAccessFromDb(data);
  }

  async getUserVideoAccess(userId: string): Promise<VideoAccess[]> {
    const { data, error } = await this.supabase
      .from('video_access')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching user video access:', error);
      return [];
    }

    return data.map((a) => this.mapVideoAccessFromDb(a));
  }

  // Helper methods to map database columns to TypeScript types
  private mapUserFromDb(data: any): User {
    return {
      id: data.id,
      walletAddress: data.wallet_address,
      username: data.username,
      email: data.email,
      isCreator: data.is_creator,
      createdAt: new Date(data.created_at),
    };
  }

  private mapVideoFromDb(data: any): Video {
    return {
      id: data.id,
      creatorId: data.creator_id,
      creatorWallet: data.creator_wallet,
      title: data.title,
      description: data.description,
      priceUsdc: data.price_usdc,
      thumbnailUrl: data.thumbnail_url,
      videoUrl: data.video_url,
      videoPath: data.video_path,
      duration: data.duration,
      views: data.views,
      earnings: data.earnings,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapPaymentFromDb(data: any): Payment {
    return {
      id: data.id,
      videoId: data.video_id,
      userId: data.user_id,
      userWallet: data.user_wallet,
      creatorWallet: data.creator_wallet,
      amount: data.amount,
      creatorAmount: data.creator_amount,
      platformAmount: data.platform_amount,
      transactionSignature: data.transaction_signature,
      status: data.status,
      verifiedAt: data.verified_at ? new Date(data.verified_at) : undefined,
      createdAt: new Date(data.created_at),
    };
  }

  private mapVideoAccessFromDb(data: any): VideoAccess {
    return {
      userId: data.user_id,
      videoId: data.video_id,
      paymentId: data.payment_id,
      expiresAt: new Date(data.expires_at),
    };
  }

  // Initialize with sample data (optional, for development)
  async initializeSampleData(): Promise<void> {
    console.log('ℹ️  Skipping sample data initialization (using Supabase)');
    // Sample data should be added directly to Supabase if needed
  }
}

export const db = new SupabaseDatabase();
