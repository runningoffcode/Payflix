import config from '../config';
import { postgresDb } from './postgres';
import { db as memoryDb } from './index';
import { db as supabaseDb } from './supabase';
import type { Video } from '../types';

export interface SearchVideosParams {
  search: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'views' | 'price_usdc';
  orderDirection?: 'asc' | 'desc';
  category?: string;
}

export interface VideoWithCreatorInfo extends Video {
  creatorUsername?: string | null;
  creatorProfilePicture?: string | null;
}

/**
 * Database Factory
 * Returns PostgreSQL, Supabase, or in-memory database based on configuration
 */

export interface Database {
  // Users
  createUser(user: any): Promise<any>;
  getUserById(id: string): Promise<any>;
  getUserByWallet(walletAddress: string): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  updateUser(id: string, updates: any): Promise<any>;
  updateUserProfile(userId: string, updates: { username?: string; profilePicture?: string; bio?: string }): Promise<any>;

  // Videos
  createVideo(video: any): Promise<any>;
  getVideoById(id: string): Promise<any>;
  getAllVideos(): Promise<VideoWithCreatorInfo[]>;
  searchVideos(params: SearchVideosParams): Promise<{
    videos: VideoWithCreatorInfo[];
    total: number;
  }>;
  getVideosByCreator(creatorId: string): Promise<any[]>;
  updateVideo(id: string, updates: any): Promise<any>;
  deleteVideo(id: string): Promise<boolean>;
  incrementVideoViews(videoId: string): Promise<void>;

  // Payments
  createPayment(payment: any): Promise<any>;
  getPaymentById(id: string): Promise<any>;
  getPaymentByTransaction(signature: string): Promise<any>;
  getPaymentsByUser(userId: string): Promise<any[]>;
  getPaymentsByVideo(videoId: string): Promise<any[]>;
  updatePayment(id: string, updates: any): Promise<any>;
  getUserPaymentForVideo(userId: string, videoId: string): Promise<any>;

  // Video Access
  grantVideoAccess(access: any): Promise<any>;
  hasVideoAccess(userId: string, videoId: string): Promise<boolean>;
  getVideoAccess(userId: string, videoId: string): Promise<any>;
  getUserVideoAccess(userId: string): Promise<any[]>;

  // Sessions (for X402 seamless payments)
  createSession(session: {
    id: string;
    userId: string;
    userWallet: string;
    sessionPublicKey: string;
    sessionPrivateKeyEncrypted: string;
    approvedAmount: number;
    approvalSignature: string;
    expiresAt: Date;
  }): Promise<any>;
  getActiveSession(userWallet: string): Promise<any | null>;
  getSessionById(sessionId: string): Promise<any | null>;
  updateSessionSpending(sessionId: string, amount: number): Promise<void>;
  updateSessionBalance(sessionId: string, newApprovedAmount: number, newRemainingAmount: number, approvalSignature: string, expiresAt: Date): Promise<void>;
  revokeSession(sessionId: string): Promise<boolean>;

  // Video Streaming Sessions (for secure streaming with wallet binding)
  createStreamingSession(session: {
    id: string;
    userWallet: string;
    videoId: string;
    sessionToken: string;
    expiresAt: Date;
  }): Promise<any>;
  getStreamingSessionByToken(sessionToken: string): Promise<any | null>;
  getActiveStreamingSession(userWallet: string, videoId: string): Promise<any | null>;
  updateStreamingSessionAccess(sessionToken: string): Promise<void>;
  cleanupExpiredStreamingSessions(): Promise<number>;

  // Comment Settings
  upsertCommentSettings(videoId: string, commentsEnabled: boolean, commentPrice: number): Promise<void>;

  // Optional methods
  initialize?(): Promise<void>;
  initializeSampleData?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * Get database instance
 */
export function getDatabase(): Database {
  if (config.database.useSupabase) {
    console.log('📦 Using Supabase database (PostgreSQL hosted)');
    return supabaseDb as Database;
  } else if (config.database.usePostgres) {
    console.log('📊 Using PostgreSQL database');
    return postgresDb as unknown as Database;
  } else {
    console.log('💾 Using in-memory database (development mode)');
    return memoryDb as unknown as Database;
  }
}

/**
 * Initialize database
 */
export async function initializeDatabase(): Promise<void> {
  const database = getDatabase();

  if (database.initialize) {
    await database.initialize();
  }

  // Initialize sample data for development (only for in-memory)
  if (!config.database.usePostgres && !config.database.useSupabase && database.initializeSampleData) {
    await database.initializeSampleData();
  }
}

// Export singleton instance
export const db = getDatabase();
