import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Video, Payment, VideoAccess } from '../types';
import type { SearchVideosParams, VideoWithCreatorInfo } from './db-factory';

/**
 * Supabase Database Service
 * Persistent database using Supabase PostgreSQL
 */
class SupabaseDatabase {
  private supabase: SupabaseClient;

  constructor() {
    // Backend uses SUPABASE_SERVICE_KEY (not VITE_ prefixed) for full database access
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    // Verify we're using service_role key (not anon)
    try {
      const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
      if (payload.role !== 'service_role') {
        console.error('⚠️  WARNING: Backend is using', payload.role, 'key instead of service_role key!');
        console.error('   This will cause permission errors. Check your .env file.');
      } else {
        console.log('✅ Using service_role key for backend database operations');
      }
    } catch (e) {
      console.warn('Could not verify Supabase key role');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('📦 Connected to Supabase database');
  }

  // Users
  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // Generate TEXT-format ID (after migration from UUID)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const { data, error } = await this.supabase
      .from('users')
      .insert([
        {
          id: userId,
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
    console.log(`🔍 getUserByWallet called with: "${walletAddress}"`);

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .single();

    console.log(`   Query result - data:`, data);
    console.log(`   Query result - error:`, error);

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`   ❌ User not found (PGRST116)`);
        return null; // Not found
      }
      console.error('❌ Error fetching user by wallet:', error);
      return null;
    }

    const mappedUser = this.mapUserFromDb(data);
    console.log(`   ✅ Mapped user:`, mappedUser);
    return mappedUser;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching user by username:', error);
      return null;
    }

    return this.mapUserFromDb(data);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const dbUpdates: any = {};
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.isCreator !== undefined) dbUpdates.is_creator = updates.isCreator;
    if (updates.profilePictureUrl !== undefined) dbUpdates.profile_image_url = updates.profilePictureUrl;

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
    const { data, error} = await this.supabase
      .from('videos')
      .insert([
        {
          id: video.id,
          creator_id: video.creatorId,
          creator_wallet: video.creatorWallet,
          title: video.title,
          description: video.description,
          category: video.category,
          price_usdc: video.priceUsdc,
          thumbnail_url: video.thumbnailUrl,
          video_url: video.videoUrl,
          video_path: video.videoPath,
          duration: video.duration,
          views: video.views,
          earnings: video.earnings,
          archived: video.archived || false, // Default to not archived
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

  async getAllVideos(): Promise<VideoWithCreatorInfo[]> {
    const { data, error } = await this.supabase
      .from('videos')
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          username,
          profile_image_url
        )
      `
      )
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
      return [];
    }

    return (data || []).map((row) => this.mapVideoWithCreator(row));
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

  async searchVideos(params: SearchVideosParams): Promise<{ videos: VideoWithCreatorInfo[]; total: number }> {
    const {
      search,
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      category,
    } = params;

    const trimmed = search.trim();
    if (!trimmed) {
      return {
        videos: [],
        total: 0,
      };
    }

    const sanitizeForLike = (value: string) =>
      value.replace(/[%_]/g, (char) => `\\${char}`);

    const wildcard = `%${sanitizeForLike(trimmed).toLowerCase()}%`;

    let query = this.supabase
      .from('videos')
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          username,
          profile_image_url
        )
      `,
        { count: 'exact', head: false }
      )
      .eq('archived', false);

    const orConditions = [
      `title.ilike.${wildcard}`,
      `description.ilike.${wildcard}`,
      `creator.username.ilike.${wildcard}`,
    ];

    query = query.or(orConditions.join(','));

    if (category) {
      query = query.eq('category', category);
    }

    query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error searching videos:', error);
      throw new Error(`Failed to search videos: ${error.message}`);
    }

    return {
      videos: (data || []).map((row) => this.mapVideoWithCreator(row)),
      total: count || 0,
    };
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.priceUsdc !== undefined) dbUpdates.price_usdc = updates.priceUsdc;
    if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;
    if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
    if (updates.videoPath !== undefined) dbUpdates.video_path = updates.videoPath;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.views !== undefined) dbUpdates.views = updates.views;
    if (updates.earnings !== undefined) dbUpdates.earnings = updates.earnings;
    if (updates.archived !== undefined) dbUpdates.archived = updates.archived;

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
    console.log(`🗄️  Database: Deleting video ${id} from Supabase with cascade...`);

    // Step 1: Delete related payments (to avoid foreign key constraint)
    console.log('   Deleting related payments...');
    const { error: paymentsError } = await this.supabase
      .from('payments')
      .delete()
      .eq('video_id', id);

    if (paymentsError) {
      console.error('⚠️  Error deleting payments:', paymentsError.message);
      // Continue anyway - payments might not exist
    } else {
      console.log('   ✅ Payments deleted');
    }

    // Step 2: Delete related video_access records
    console.log('   Deleting related video_access records...');
    const { error: accessError } = await this.supabase
      .from('video_access')
      .delete()
      .eq('video_id', id);

    if (accessError) {
      console.error('⚠️  Error deleting video_access:', accessError.message);
      // Continue anyway - access records might not exist
    } else {
      console.log('   ✅ Video access records deleted');
    }

    // Step 3: Delete the video itself
    console.log('   Deleting video record...');
    const { data, error, count } = await this.supabase
      .from('videos')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error deleting video from database:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error(`⚠️  Video ${id} was not found in database - nothing deleted`);
      return false;
    }

    console.log(`✅ Database: Video ${id} and all related records deleted successfully (${data.length} row(s) affected)`);
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
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error checking video access:', error);
      return false;
    }

    const hasAccess = data && data.length > 0;
    if (hasAccess) {
      console.log(`✅ Video access check: User ${userId} has access to video ${videoId}`);
    }
    return hasAccess;
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
      profilePictureUrl: data.profile_image_url,
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
      category: data.category || 'Entertainment',
      priceUsdc: data.price_usdc,
      thumbnailUrl: data.thumbnail_url,
      videoUrl: data.video_url,
      videoPath: data.video_path,
      duration: data.duration,
      views: data.views,
      earnings: data.earnings,
      archived: data.archived || false, // Default to false if not set
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapVideoWithCreator(data: any): VideoWithCreatorInfo {
    const base = this.mapVideoFromDb(data);
    return {
      ...base,
      creatorUsername: data.creator?.username ?? null,
      creatorProfilePicture: data.creator?.profile_image_url ?? null,
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

  // Sessions (for X402 seamless payments with session keys)
  async createSession(session: {
    id: string;
    userId: string;
    userWallet: string;
    sessionPublicKey: string;
    sessionPrivateKeyEncrypted: string;
    approvedAmount: number;
    approvalSignature: string;
    expiresAt: Date;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('sessions')
      .insert([
        {
          id: session.id,
          user_id: session.userId,
          user_wallet: session.userWallet,
          session_public_key: session.sessionPublicKey,
          session_private_key_encrypted: session.sessionPrivateKeyEncrypted,
          approved_amount: session.approvedAmount,
          spent_amount: 0,
          remaining_amount: session.approvedAmount,
          approval_signature: session.approvalSignature,
          status: 'active',
          expires_at: session.expiresAt.toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return data;
  }

  async getActiveSession(userWallet: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('user_wallet', userWallet)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .gt('remaining_amount', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      return null;
    }

    return data;
  }

  async getSessionById(sessionId: string): Promise<any | null> {
    const { data, error} = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      return null;
    }

    return data;
  }

  async updateSessionSpending(sessionId: string, amount: number): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const newSpentAmount = parseFloat(session.spent_amount) + amount;
    const newRemainingAmount = parseFloat(session.approved_amount) - newSpentAmount;

    const { error } = await this.supabase
      .from('sessions')
      .update({
        spent_amount: newSpentAmount,
        remaining_amount: newRemainingAmount,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session spending:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('sessions')
      .update({ status: 'revoked' })
      .eq('id', sessionId);

    if (error) {
      console.error('Error revoking session:', error);
      return false;
    }

    return true;
  }

  async updateSessionBalance(sessionId: string, newApprovedAmount: number, newRemainingAmount: number, approvalSignature: string, expiresAt: Date): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        approved_amount: newApprovedAmount,
        remaining_amount: newRemainingAmount,
        approval_signature: approvalSignature,
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session balance:', error);
      throw new Error(`Failed to update session balance: ${error.message}`);
    }
  }

  async updateUserProfile(userId: string, updates: { username?: string; profilePicture?: string }): Promise<User | null> {
    const updateData: any = {};

    if (updates.username) updateData.username = updates.username;
    if (updates.profilePicture) updateData.profile_picture = updates.profilePicture;

    const { data, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }

    return this.mapUserFromDb(data);
  }

  // Video Streaming Sessions (for secure streaming with wallet binding)
  async createStreamingSession(session: {
    id: string;
    userWallet: string;
    videoId: string;
    sessionToken: string;
    expiresAt: Date;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('video_streaming_sessions')
      .insert([
        {
          id: session.id,
          user_wallet: session.userWallet,
          video_id: session.videoId,
          session_token: session.sessionToken,
          expires_at: session.expiresAt.toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating streaming session:', error);
      throw new Error(`Failed to create streaming session: ${error.message}`);
    }

    return data;
  }

  async getStreamingSessionByToken(sessionToken: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('video_streaming_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching streaming session by token:', error);
      return null;
    }

    return data;
  }

  async getActiveStreamingSession(userWallet: string, videoId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('video_streaming_sessions')
      .select('*')
      .eq('user_wallet', userWallet)
      .eq('video_id', videoId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      return null;
    }

    return data;
  }

  async updateStreamingSessionAccess(sessionToken: string): Promise<void> {
    const { error } = await this.supabase
      .from('video_streaming_sessions')
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Error updating streaming session access time:', error);
      // Non-critical error, don't throw
    }
  }

  async cleanupExpiredStreamingSessions(): Promise<number> {
    const { data, error } = await this.supabase
      .from('video_streaming_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      console.error('Error cleaning up expired streaming sessions:', error);
      return 0;
    }

    return data?.length || 0;
  }

  // Comment Settings
  async upsertCommentSettings(videoId: string, commentsEnabled: boolean, commentPrice: number): Promise<void> {
    const { error } = await this.supabase
      .from('comment_settings')
      .upsert({
        video_id: videoId,
        comments_enabled: commentsEnabled,
        comment_price: commentPrice,
      }, {
        onConflict: 'video_id'
      });

    if (error) {
      console.error('Error upserting comment settings:', error);
      throw new Error(`Failed to update comment settings: ${error.message}`);
    }
  }

  // Initialize with sample data (optional, for development)
  async initializeSampleData(): Promise<void> {
    console.log('ℹ️  Skipping sample data initialization (using Supabase)');
    // Sample data should be added directly to Supabase if needed
  }
}

export const db = new SupabaseDatabase();
