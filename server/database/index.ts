import { User, Video, Payment, VideoAccess } from '../types';

/**
 * In-Memory Database
 * For production, replace with PostgreSQL, MongoDB, or other database
 */
class Database {
  private users: Map<string, User> = new Map();
  private videos: Map<string, Video> = new Map();
  private payments: Map<string, Payment> = new Map();
  private videoAccess: Map<string, VideoAccess> = new Map();

  // Users
  async createUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
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

  // Videos
  async createVideo(video: Video): Promise<Video> {
    this.videos.set(video.id, video);
    return video;
  }

  async getVideoById(id: string): Promise<Video | null> {
    return this.videos.get(id) || null;
  }

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
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
    const creator1: User = {
      id: 'user_creator_1',
      walletAddress: 'CreatorWalletAddress1234567890123456789',
      username: 'TechCreator',
      email: 'creator@example.com',
      isCreator: true,
      createdAt: new Date(),
    };
    await this.createUser(creator1);

    // Sample viewer user
    const viewer1: User = {
      id: 'user_viewer_1',
      walletAddress: 'ViewerWalletAddress1234567890123456789',
      username: 'VideoFan',
      email: 'viewer@example.com',
      isCreator: false,
      createdAt: new Date(),
    };
    await this.createUser(viewer1);

    // Sample videos
    const video1: Video = {
      id: 'video_1',
      creatorId: creator1.id,
      creatorWallet: creator1.walletAddress,
      title: 'Introduction to Solana Development',
      description: 'Learn the basics of building on Solana blockchain. Perfect for beginners!',
      priceUsdc: 2.99,
      thumbnailUrl: 'https://picsum.photos/seed/video1/640/360',
      videoUrl: '/api/videos/video_1/stream',
      duration: 1245, // seconds
      views: 127,
      earnings: 0,
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
      priceUsdc: 4.99,
      thumbnailUrl: 'https://picsum.photos/seed/video2/640/360',
      videoUrl: '/api/videos/video_2/stream',
      duration: 2156,
      views: 89,
      earnings: 0,
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
      priceUsdc: 6.99,
      thumbnailUrl: 'https://picsum.photos/seed/video3/640/360',
      videoUrl: '/api/videos/video_3/stream',
      duration: 3421,
      views: 234,
      earnings: 0,
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
