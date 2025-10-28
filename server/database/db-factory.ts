import config from '../config';
import { postgresDb } from './postgres';
import { db as memoryDb } from './index';
import { db as supabaseDb } from './supabase';

/**
 * Database Factory
 * Returns PostgreSQL, Supabase, or in-memory database based on configuration
 */

export interface Database {
  // Users
  createUser(user: any): Promise<any>;
  getUserById(id: string): Promise<any>;
  getUserByWallet(walletAddress: string): Promise<any>;
  updateUser(id: string, updates: any): Promise<any>;

  // Videos
  createVideo(video: any): Promise<any>;
  getVideoById(id: string): Promise<any>;
  getAllVideos(): Promise<any[]>;
  getVideosByCreator(creatorId: string): Promise<any[]>;
  updateVideo(id: string, updates: any): Promise<any>;
  deleteVideo(id: string): Promise<boolean>;

  // Payments
  createPayment(payment: any): Promise<any>;
  getPaymentById(id: string): Promise<any>;
  getPaymentByTransaction(signature: string): Promise<any>;
  getPaymentsByUser(userId: string): Promise<any[]>;
  getPaymentsByVideo(videoId: string): Promise<any[]>;
  updatePayment(id: string, updates: any): Promise<any>;

  // Video Access
  grantVideoAccess(access: any): Promise<any>;
  hasVideoAccess(userId: string, videoId: string): Promise<boolean>;
  getVideoAccess(userId: string, videoId: string): Promise<any>;
  getUserVideoAccess(userId: string): Promise<any[]>;

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
    return postgresDb as Database;
  } else {
    console.log('💾 Using in-memory database (development mode)');
    return memoryDb as Database;
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
