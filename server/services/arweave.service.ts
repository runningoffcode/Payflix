import Arweave from 'arweave';
import fs from 'fs';
import path from 'path';
import config from '../config';

/**
 * Arweave Storage Service
 * Handles permanent decentralized video storage on Arweave
 */
export class ArweaveService {
  private arweave: Arweave;
  private wallet: any;

  constructor() {
    // Initialize Arweave client
    this.arweave = Arweave.init({
      host: config.arweave.host,
      port: config.arweave.port,
      protocol: config.arweave.protocol,
    });

    // Load wallet from file or environment
    this.loadWallet();
  }

  /**
   * Load Arweave wallet
   */
  private async loadWallet(): Promise<void> {
    try {
      if (config.arweave.walletPath && fs.existsSync(config.arweave.walletPath)) {
        const walletData = fs.readFileSync(config.arweave.walletPath, 'utf8');
        this.wallet = JSON.parse(walletData);
        console.log('✅ Arweave wallet loaded');
      } else if (config.arweave.walletKey) {
        this.wallet = JSON.parse(config.arweave.walletKey);
        console.log('✅ Arweave wallet loaded from environment');
      } else {
        console.warn('⚠️  No Arweave wallet configured - uploads will fail');
      }
    } catch (error) {
      console.error('❌ Failed to load Arweave wallet:', error);
    }
  }

  /**
   * Upload video to Arweave
   */
  async uploadVideo(
    filePath: string,
    metadata: {
      title: string;
      description: string;
      creatorWallet: string;
      priceUsdc: number;
    }
  ): Promise<{
    transactionId: string;
    url: string;
  }> {
    if (!this.wallet) {
      throw new Error('Arweave wallet not configured');
    }

    try {
      console.log(`📤 Uploading video to Arweave: ${metadata.title}`);

      // Read video file
      const data = fs.readFileSync(filePath);

      // Create transaction
      const transaction = await this.arweave.createTransaction(
        { data },
        this.wallet
      );

      // Add tags for metadata
      transaction.addTag('Content-Type', this.getContentType(filePath));
      transaction.addTag('App-Name', 'Flix');
      transaction.addTag('App-Version', '1.0.0');
      transaction.addTag('Type', 'video');
      transaction.addTag('Title', metadata.title);
      transaction.addTag('Description', metadata.description);
      transaction.addTag('Creator', metadata.creatorWallet);
      transaction.addTag('Price-USDC', metadata.priceUsdc.toString());
      transaction.addTag('Protocol', 'x402');
      transaction.addTag('Uploaded-At', new Date().toISOString());

      // Sign transaction
      await this.arweave.transactions.sign(transaction, this.wallet);

      // Submit transaction
      const response = await this.arweave.transactions.post(transaction);

      if (response.status === 200) {
        const transactionId = transaction.id;
        const url = `${config.arweave.gateway}/${transactionId}`;

        console.log(`✅ Video uploaded to Arweave: ${transactionId}`);
        console.log(`🔗 URL: ${url}`);

        return {
          transactionId,
          url,
        };
      } else {
        throw new Error(`Upload failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Arweave upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload video thumbnail to Arweave
   */
  async uploadThumbnail(
    filePath: string,
    videoTitle: string
  ): Promise<{
    transactionId: string;
    url: string;
  }> {
    if (!this.wallet) {
      throw new Error('Arweave wallet not configured');
    }

    try {
      console.log(`📤 Uploading thumbnail to Arweave`);

      const data = fs.readFileSync(filePath);

      const transaction = await this.arweave.createTransaction(
        { data },
        this.wallet
      );

      transaction.addTag('Content-Type', this.getContentType(filePath));
      transaction.addTag('App-Name', 'Flix');
      transaction.addTag('Type', 'thumbnail');
      transaction.addTag('Video-Title', videoTitle);

      await this.arweave.transactions.sign(transaction, this.wallet);
      const response = await this.arweave.transactions.post(transaction);

      if (response.status === 200) {
        const transactionId = transaction.id;
        const url = `${config.arweave.gateway}/${transactionId}`;

        console.log(`✅ Thumbnail uploaded to Arweave: ${transactionId}`);
        return { transactionId, url };
      } else {
        throw new Error(`Thumbnail upload failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Arweave thumbnail upload failed:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{
    status: string;
    confirmed: boolean;
    blockHeight?: number;
  }> {
    try {
      const status = await this.arweave.transactions.getStatus(transactionId);

      return {
        status: status.status === 200 ? 'confirmed' : 'pending',
        confirmed: status.confirmed?.block_height !== undefined,
        blockHeight: status.confirmed?.block_height,
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return {
        status: 'unknown',
        confirmed: false,
      };
    }
  }

  /**
   * Get wallet balance in AR
   */
  async getBalance(): Promise<number> {
    if (!this.wallet) {
      return 0;
    }

    try {
      const address = await this.arweave.wallets.jwkToAddress(this.wallet);
      const balance = await this.arweave.wallets.getBalance(address);
      return parseFloat(this.arweave.ar.winstonToAr(balance));
    } catch (error) {
      console.error('Error getting Arweave balance:', error);
      return 0;
    }
  }

  /**
   * Estimate upload cost
   */
  async estimateUploadCost(fileSizeBytes: number): Promise<{
    ar: number;
    usd: number;
  }> {
    try {
      const costWinston = await this.arweave.transactions.getPrice(fileSizeBytes);
      const costAr = parseFloat(this.arweave.ar.winstonToAr(costWinston));

      // Get AR price (you'd fetch this from an oracle in production)
      const arPriceUsd = 10; // Placeholder

      return {
        ar: costAr,
        usd: costAr * arPriceUsd,
      };
    } catch (error) {
      console.error('Error estimating cost:', error);
      return { ar: 0, usd: 0 };
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Stream video from Arweave
   * Returns the Arweave gateway URL for streaming
   */
  getStreamUrl(transactionId: string): string {
    return `${config.arweave.gateway}/${transactionId}`;
  }
}

export const arweaveService = new ArweaveService();
