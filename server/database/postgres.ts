import { Pool, QueryResult } from 'pg';
import config from '../config';
import { User, Video, Payment, VideoAccess } from '../types';
import type { SearchVideosParams, VideoWithCreatorInfo } from './db-factory';

/**
 * PostgreSQL Database Service
 * Production-ready database implementation
 */
class PostgresDatabase {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connected successfully');
      client.release();
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      throw error;
    }
  }

  /**
   * Execute a query
   */
  private async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error:', { text, error });
      throw error;
    }
  }

  // ==================== Users ====================

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const result = await this.query(
      `INSERT INTO users (wallet_address, username, email, is_creator)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.walletAddress, user.username, user.email, user.isCreator]
    );
    return this.mapUser(result.rows[0]);
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.username !== undefined) {
      fields.push(`username = $${paramCount++}`);
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }
    if (updates.isCreator !== undefined) {
      fields.push(`is_creator = $${paramCount++}`);
      values.push(updates.isCreator);
    }

    if (fields.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);
    const result = await this.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  // ==================== Videos ====================

  async createVideo(video: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>): Promise<Video> {
    const result = await this.query(
      `INSERT INTO videos (
        creator_id, creator_wallet, title, description, price_usdc,
        thumbnail_url, video_url, video_path, duration, views, earnings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        video.creatorId,
        video.creatorWallet,
        video.title,
        video.description,
        video.priceUsdc,
        video.thumbnailUrl,
        video.videoUrl,
        video.videoPath || null,
        video.duration,
        video.views,
        video.earnings,
      ]
    );
    return this.mapVideo(result.rows[0]);
  }

  async getVideoById(id: string): Promise<Video | null> {
    const result = await this.query(
      "SELECT * FROM videos WHERE id = $1 AND status = 'active'",
      [id]
    );
    return result.rows[0] ? this.mapVideo(result.rows[0]) : null;
  }

  async getAllVideos(): Promise<VideoWithCreatorInfo[]> {
    const result = await this.query(
      `SELECT v.*, u.username AS creator_username, u.profile_image_url AS creator_profile_picture
       FROM videos v
       LEFT JOIN users u ON u.id = v.creator_id
       WHERE v.status = 'active'
       ORDER BY v.created_at DESC`
    );
    return result.rows.map((row) => this.mapVideoWithCreator(row));
  }

  async getVideosByCreator(creatorId: string): Promise<Video[]> {
    const result = await this.query(
      "SELECT * FROM videos WHERE creator_id = $1 AND status = 'active' ORDER BY created_at DESC",
      [creatorId]
    );
    return result.rows.map(this.mapVideo);
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

    const normalizedOrder =
      orderBy === 'views' ? 'views' : orderBy === 'price_usdc' ? 'price_usdc' : 'created_at';
    const direction = orderDirection === 'asc' ? 'ASC' : 'DESC';

    const filterValues: any[] = [];
    let whereClause = `WHERE v.status = 'active'`;

    if (category) {
      filterValues.push(category);
      whereClause += ` AND v.category = $${filterValues.length}`;
    }

    const escapedSearch = trimmed.replace(/[%_]/g, (char) => `\\${char}`);
    filterValues.push(`%${escapedSearch}%`);
    const searchIndex = filterValues.length;

    whereClause += `
      AND (
        v.title ILIKE $${searchIndex} OR
        v.description ILIKE $${searchIndex} OR
        u.username ILIKE $${searchIndex}
      )`;

    const totalResult = await this.query(
      `SELECT COUNT(*) AS count
       FROM videos v
       LEFT JOIN users u ON u.id = v.creator_id
       ${whereClause}`,
      filterValues
    );

    const limitIndex = filterValues.length + 1;
    const offsetIndex = filterValues.length + 2;
    const pagedValues = [...filterValues, limit, offset];

    const videoResult = await this.query(
      `SELECT v.*, u.username AS creator_username, u.profile_image_url AS creator_profile_picture
       FROM videos v
       LEFT JOIN users u ON u.id = v.creator_id
       ${whereClause}
       ORDER BY v.${normalizedOrder} ${direction}
       LIMIT $${limitIndex}
       OFFSET $${offsetIndex}`,
      pagedValues
    );

    const videos = videoResult.rows.map((row) => this.mapVideoWithCreator(row));
    const total = parseInt(totalResult.rows[0]?.count || '0', 10);

    return { videos, total };
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.priceUsdc !== undefined) {
      fields.push(`price_usdc = $${paramCount++}`);
      values.push(updates.priceUsdc);
    }
    if (updates.views !== undefined) {
      fields.push(`views = $${paramCount++}`);
      values.push(updates.views);
    }
    if (updates.earnings !== undefined) {
      fields.push(`earnings = $${paramCount++}`);
      values.push(updates.earnings);
    }
    if (updates.videoPath !== undefined) {
      fields.push(`video_path = $${paramCount++}`);
      values.push(updates.videoPath);
    }

    if (fields.length === 0) {
      return this.getVideoById(id);
    }

    values.push(id);
    const result = await this.query(
      `UPDATE videos SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] ? this.mapVideo(result.rows[0]) : null;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const result = await this.query(
      "UPDATE videos SET status = 'deleted' WHERE id = $1",
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async incrementVideoViews(videoId: string): Promise<void> {
    await this.query(
      'UPDATE videos SET views = views + 1 WHERE id = $1',
      [videoId]
    );
  }

  // ==================== Payments ====================

  async createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const result = await this.query(
      `INSERT INTO payments (
        video_id, user_id, user_wallet, creator_wallet, amount,
        creator_amount, platform_amount, transaction_signature, status, verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        payment.videoId,
        payment.userId,
        payment.userWallet,
        payment.creatorWallet,
        payment.amount,
        payment.creatorAmount,
        payment.platformAmount,
        payment.transactionSignature,
        payment.status,
        payment.verifiedAt,
      ]
    );
    return this.mapPayment(result.rows[0]);
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const result = await this.query('SELECT * FROM payments WHERE id = $1', [id]);
    return result.rows[0] ? this.mapPayment(result.rows[0]) : null;
  }

  async getPaymentByTransaction(signature: string): Promise<Payment | null> {
    const result = await this.query(
      'SELECT * FROM payments WHERE transaction_signature = $1',
      [signature]
    );
    return result.rows[0] ? this.mapPayment(result.rows[0]) : null;
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    const result = await this.query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(this.mapPayment);
  }

  async getPaymentsByVideo(videoId: string): Promise<Payment[]> {
    const result = await this.query(
      'SELECT * FROM payments WHERE video_id = $1 ORDER BY created_at DESC',
      [videoId]
    );
    return result.rows.map(this.mapPayment);
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.verifiedAt !== undefined) {
      fields.push(`verified_at = $${paramCount++}`);
      values.push(updates.verifiedAt);
    }

    if (fields.length === 0) {
      return this.getPaymentById(id);
    }

    values.push(id);
    const result = await this.query(
      `UPDATE payments SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] ? this.mapPayment(result.rows[0]) : null;
  }

  async getUserPaymentForVideo(userId: string, videoId: string): Promise<Payment | null> {
    const result = await this.query(
      `SELECT * FROM payments
       WHERE user_id = $1 AND video_id = $2 AND status = 'verified'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, videoId]
    );
    return result.rows[0] ? this.mapPayment(result.rows[0]) : null;
  }

  // ==================== Video Access ====================

  async grantVideoAccess(access: Omit<VideoAccess, 'id'>): Promise<VideoAccess> {
    const result = await this.query(
      `INSERT INTO video_access (user_id, video_id, payment_id, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, video_id) DO UPDATE
       SET expires_at = EXCLUDED.expires_at
       RETURNING *`,
      [access.userId, access.videoId, access.paymentId, access.expiresAt]
    );
    return this.mapVideoAccess(result.rows[0]);
  }

  async hasVideoAccess(userId: string, videoId: string): Promise<boolean> {
    const result = await this.query(
      `SELECT * FROM video_access
       WHERE user_id = $1 AND video_id = $2
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, videoId]
    );
    return result.rows.length > 0;
  }

  async getVideoAccess(userId: string, videoId: string): Promise<VideoAccess | null> {
    const result = await this.query(
      'SELECT * FROM video_access WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );
    return result.rows[0] ? this.mapVideoAccess(result.rows[0]) : null;
  }

  async getUserVideoAccess(userId: string): Promise<VideoAccess[]> {
    const result = await this.query(
      `SELECT * FROM video_access
       WHERE user_id = $1
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );
    return result.rows.map(this.mapVideoAccess);
  }

  // ==================== Mappers ====================

  private mapUser(row: any): User {
    return {
      id: row.id,
      walletAddress: row.wallet_address,
      username: row.username,
      email: row.email,
      isCreator: row.is_creator,
      createdAt: row.created_at,
    };
  }

  private mapVideo(row: any): Video {
    return {
      id: row.id,
      creatorId: row.creator_id,
      creatorWallet: row.creator_wallet,
      title: row.title,
      description: row.description,
      category: row.category || 'Entertainment',
      priceUsdc: parseFloat(row.price_usdc),
      thumbnailUrl: row.thumbnail_url,
      videoUrl: row.video_url,
      videoPath: row.video_path,
      duration: row.duration,
      views: row.views,
      earnings: parseFloat(row.earnings),
      archived: row.archived || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapVideoWithCreator(row: any): VideoWithCreatorInfo {
    const base = this.mapVideo(row);
    return {
      ...base,
      creatorUsername: row.creator_username || null,
      creatorProfilePicture: row.creator_profile_picture || null,
    };
  }

  private mapPayment(row: any): Payment {
    return {
      id: row.id,
      videoId: row.video_id,
      userId: row.user_id,
      userWallet: row.user_wallet,
      creatorWallet: row.creator_wallet,
      amount: parseFloat(row.amount),
      creatorAmount: parseFloat(row.creator_amount),
      platformAmount: parseFloat(row.platform_amount),
      transactionSignature: row.transaction_signature,
      status: row.status,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
    };
  }

  private mapVideoAccess(row: any): VideoAccess {
    return {
      userId: row.user_id,
      videoId: row.video_id,
      paymentId: row.payment_id,
      expiresAt: row.expires_at,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const postgresDb = new PostgresDatabase();
