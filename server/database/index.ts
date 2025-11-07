import { User, Video, Payment, VideoAccess } from '../types';
import type { SearchVideosParams, VideoWithCreatorInfo, SubscriptionWithCreatorInfo } from './db-factory';

/**
 * In-Memory Database
 * For production, replace with PostgreSQL, MongoDB, or other database
 */
class Database {
  private users: Map<string, User> = new Map();
  private videos: Map<string, Video> = new Map();
  private payments: Map<string, Payment> = new Map();
  private videoAccess: Map<string, VideoAccess> = new Map();
  private subscriptions: Map<string, Map<string, Date>> = new Map();

  // Users
  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.walletAddress.toLowerCase() === walletAddress.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  private ensureSubscriptionBucket(subscriberWallet: string): Map<string, Date> {
    if (!this.subscriptions.has(subscriberWallet)) {
      this.subscriptions.set(subscriberWallet, new Map());
    }
    return this.subscriptions.get(subscriberWallet)!;
  }

  async getSubscriberCount(creatorWallet: string): Promise<number> {
    let count = 0;
    for (const subscriptions of this.subscriptions.values()) {
      if (subscriptions.has(creatorWallet)) {
        count += 1;
      }
    }
    return count;
  }

  async getSubscriptionsBySubscriber(subscriberWallet: string): Promise<SubscriptionWithCreatorInfo[]> {
    const bucket = this.subscriptions.get(subscriberWallet);
    if (!bucket) {
      return [];
    }

    return Array.from(bucket.entries()).map(([creatorWallet, subscribedAt]) => {
      const creator = Array.from(this.users.values()).find(
        (user) => user.walletAddress === creatorWallet
      );

      return {
        id: `${subscriberWallet}_${creatorWallet}`,
        subscriberWallet,
        creatorWallet,
        subscribedAt,
        creator: creator
          ? {
              id: creator.id,
              walletAddress: creator.walletAddress,
              username: creator.username,
              profilePictureUrl: creator.profilePictureUrl,
              bio: creator.bio ?? null,
            }
          : undefined,
      };
    });
  }

  async createSubscription(subscriberWallet: string, creatorWallet: string): Promise<void> {
    const bucket = this.ensureSubscriptionBucket(subscriberWallet);
    bucket.set(creatorWallet, new Date());
  }

  async deleteSubscription(subscriberWallet: string, creatorWallet: string): Promise<void> {
    const bucket = this.subscriptions.get(subscriberWallet);
    bucket?.delete(creatorWallet);
  }

  async isSubscribed(subscriberWallet: string, creatorWallet: string): Promise<boolean> {
    const bucket = this.subscriptions.get(subscriberWallet);
    return bucket?.has(creatorWallet) ?? false;
  }

  // Videos
  async createVideo(video: Video): Promise<Video> {
    this.videos.set(video.id, video);
    return video;
  }

  async getVideoById(id: string): Promise<Video | null> {
    return this.videos.get(id) || null;
  }

  private mapVideoWithCreator(video: Video): VideoWithCreatorInfo {
    const creator = this.users.get(video.creatorId);
    return {
      ...video,
      creatorUsername: creator?.username || null,
      creatorProfilePicture: creator?.profilePictureUrl || null,
    };
  }

  async getAllVideos(): Promise<VideoWithCreatorInfo[]> {
    // Filter out archived videos from public listings
    return Array.from(this.videos.values())
      .filter((v) => !v.archived)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((video) => this.mapVideoWithCreator(video));
  }

  async searchVideos(params: SearchVideosParams): Promise<{ videos: VideoWithCreatorInfo[]; total: number }> {
    const {
      search,
      limit = 20,
      offset = 0,
      category,
      orderBy = 'created_at',
      orderDirection = 'desc',
      creatorWallet,
    } = params;

    const normalizedSearch = search.trim().toLowerCase();

    let results = Array.from(this.videos.values()).filter((video) => {
      if (video.archived) return false;
      if (category && video.category !== category) return false;
      if (creatorWallet && video.creatorWallet !== creatorWallet) return false;

      const creator = this.users.get(video.creatorId);
      const haystack = [
        video.title,
        video.description,
        creator?.username ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    results = results.sort((a, b) => {
      const direction = orderDirection === 'asc' ? 1 : -1;
      switch (orderBy) {
        case 'views':
          return (a.views - b.views) * direction;
        case 'price_usdc':
          return (a.priceUsdc - b.priceUsdc) * direction;
        case 'created_at':
        default:
          return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
      }
    });

    const paged = results.slice(offset, offset + limit).map((video) => this.mapVideoWithCreator(video));

    return {
      videos: paged,
      total: results.length,
    };
  }

  async getVideosByCreator(creatorId: string): Promise<Video[]> {
    return Array.from(this.videos.values())
      .filter((v) => v.creatorId === creatorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
    const video = this.videos.get(id);
    if (!video) return null;

    const updated = { ...video, ...updates, updatedAt: new Date() };
    this.videos.set(id, updated);
    return updated;
  }

  async deleteVideo(id: string): Promise<boolean> {
    return this.videos.delete(id);
  }

  async incrementVideoViews(videoId: string): Promise<void> {
    const video = this.videos.get(videoId);
    if (video) {
      video.views += 1;
      this.videos.set(videoId, video);
    }
  }

  // Payments
  async createPayment(payment: Payment): Promise<Payment> {
    this.payments.set(payment.id, payment);
    return payment;
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return this.payments.get(id) || null;
  }

  async getPaymentByTransaction(signature: string): Promise<Payment | null> {
    for (const payment of this.payments.values()) {
      if (payment.transactionSignature === signature) {
        return payment;
      }
    }
    return null;
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPaymentsByVideo(videoId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter((p) => p.videoId === videoId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const payment = this.payments.get(id);
    if (!payment) return null;

    const updated = { ...payment, ...updates };
    this.payments.set(id, updated);
    return updated;
  }

  async getUserPaymentForVideo(userId: string, videoId: string): Promise<Payment | null> {
    for (const payment of this.payments.values()) {
      if (payment.userId === userId &&
          payment.videoId === videoId &&
          payment.status === 'verified') {
        return payment;
      }
    }
    return null;
  }

  // Video Access
  async grantVideoAccess(access: VideoAccess): Promise<VideoAccess> {
    const key = `${access.userId}_${access.videoId}`;
    this.videoAccess.set(key, access);
    return access;
  }

  async hasVideoAccess(userId: string, videoId: string): Promise<boolean> {
    const key = `${userId}_${videoId}`;
    const access = this.videoAccess.get(key);

    if (!access) return false;

    // Check if access has expired
    if (access.expiresAt && access.expiresAt < new Date()) {
      this.videoAccess.delete(key);
      return false;
    }

    return true;
  }

  async getVideoAccess(userId: string, videoId: string): Promise<VideoAccess | null> {
    const key = `${userId}_${videoId}`;
    return this.videoAccess.get(key) || null;
  }

  async getUserVideoAccess(userId: string): Promise<VideoAccess[]> {
    return Array.from(this.videoAccess.values()).filter(
      (access) => access.userId === userId && access.expiresAt > new Date()
    );
  }

  // Initialize with sample data
  async initializeSampleData(): Promise<void> {
    // Sample creator user
    const creator1 = await this.createUser({
      walletAddress: 'CreatorWalletAddress1234567890123456789',
      username: 'TechCreator',
      email: 'creator@example.com',
      isCreator: true,
    });

    // Sample viewer user
    const viewer1 = await this.createUser({
      walletAddress: 'ViewerWalletAddress1234567890123456789',
      username: 'VideoFan',
      email: 'viewer@example.com',
      isCreator: false,
    });

    // Sample videos
    const video1: Video = {
      id: 'video_1',
      creatorId: creator1.id,
      creatorWallet: creator1.walletAddress,
      title: 'Introduction to Solana Development',
      description: 'Learn the basics of building on Solana blockchain. Perfect for beginners!',
      category: 'Education',
      priceUsdc: 2.99,
      thumbnailUrl: 'https://picsum.photos/seed/video1/640/360',
      videoUrl: '/api/videos/video_1/stream',
      duration: 1245, // seconds
      views: 127,
      earnings: 0,
      archived: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updatedAt: new Date(),
    };
    await this.createVideo(video1);

    const video2: Video = {
      id: 'video_2',
      creatorId: creator1.id,
      creatorWallet: creator1.walletAddress,
      title: 'Advanced Web3 Patterns',
      description: 'Deep dive into Web3 development patterns and best practices.',
      category: 'Technology',
      priceUsdc: 4.99,
      thumbnailUrl: 'https://picsum.photos/seed/video2/640/360',
      videoUrl: '/api/videos/video_2/stream',
      duration: 2156,
      views: 89,
      earnings: 0,
      archived: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      updatedAt: new Date(),
    };
    await this.createVideo(video2);

    const video3: Video = {
      id: 'video_3',
      creatorId: creator1.id,
      creatorWallet: creator1.walletAddress,
      title: 'Building DApps on Solana',
      description: 'Complete guide to building decentralized applications on Solana.',
      category: 'Technology',
      priceUsdc: 6.99,
      thumbnailUrl: 'https://picsum.photos/seed/video3/640/360',
      videoUrl: '/api/videos/video_3/stream',
      duration: 3421,
      views: 234,
      earnings: 0,
      archived: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      updatedAt: new Date(),
    };
    await this.createVideo(video3);

    console.log('Sample data initialized:');
    console.log(`- ${this.users.size} users`);
    console.log(`- ${this.videos.size} videos`);
  }
}

export const db = new Database();
