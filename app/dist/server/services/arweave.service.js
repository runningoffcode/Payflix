"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arweaveService = exports.ArweaveService = void 0;
const arweave_1 = __importDefault(require("arweave"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const local_storage_service_1 = require("./local-storage.service");
/**
 * Arweave Storage Service
 * Handles permanent decentralized video storage on Arweave
 * Falls back to local storage when Arweave wallet is not configured
 */
class ArweaveService {
    constructor() {
        Object.defineProperty(this, "arweave", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "wallet", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "useLocalStorage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        // Initialize Arweave client
        this.arweave = arweave_1.default.init({
            host: config_1.default.arweave.host,
            port: config_1.default.arweave.port,
            protocol: config_1.default.arweave.protocol,
        });
        // Load wallet from file or environment (synchronously)
        this.loadWalletSync();
    }
    /**
     * Load Arweave wallet synchronously
     */
    loadWalletSync() {
        try {
            console.log('🔍 DEBUG: Checking Arweave wallet path:', config_1.default.arweave.walletPath);
            console.log('🔍 DEBUG: Path exists?', config_1.default.arweave.walletPath ? fs_1.default.existsSync(config_1.default.arweave.walletPath) : false);
            if (config_1.default.arweave.walletPath && fs_1.default.existsSync(config_1.default.arweave.walletPath)) {
                const walletData = fs_1.default.readFileSync(config_1.default.arweave.walletPath, 'utf8');
                this.wallet = JSON.parse(walletData);
                console.log('✅ Arweave wallet loaded');
                this.useLocalStorage = false;
            }
            else if (config_1.default.arweave.walletKey) {
                this.wallet = JSON.parse(config_1.default.arweave.walletKey);
                console.log('✅ Arweave wallet loaded from environment');
                this.useLocalStorage = false;
            }
            else {
                console.warn('⚠️  No Arweave wallet configured - using local storage fallback');
                this.useLocalStorage = true;
            }
        }
        catch (error) {
            console.error('❌ Failed to load Arweave wallet:', error);
            console.log('   Using local storage fallback');
            this.useLocalStorage = true;
        }
    }
    /**
     * Upload video to Arweave (or local storage if Arweave not configured)
     */
    async uploadVideo(filePath, metadata) {
        // Use local storage fallback if Arweave not configured
        if (this.useLocalStorage) {
            console.log('📦 Using local storage (Arweave not configured)');
            return local_storage_service_1.localStorageService.uploadVideo(filePath, metadata);
        }
        if (!this.wallet) {
            throw new Error('Arweave wallet not configured');
        }
        try {
            console.log(`📤 Uploading video to Arweave: ${metadata.title}`);
            // Read video file
            const data = fs_1.default.readFileSync(filePath);
            // Create transaction
            const transaction = await this.arweave.createTransaction({ data }, this.wallet);
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
                const url = `${config_1.default.arweave.gateway}/${transactionId}`;
                console.log(`✅ Video uploaded to Arweave: ${transactionId}`);
                console.log(`🔗 URL: ${url}`);
                return {
                    transactionId,
                    url,
                };
            }
            else {
                throw new Error(`Upload failed with status ${response.status}`);
            }
        }
        catch (error) {
            console.error('❌ Arweave upload failed:', error);
            throw error;
        }
    }
    /**
     * Upload video thumbnail to Arweave (or local storage if Arweave not configured)
     */
    async uploadThumbnail(filePath, videoTitle) {
        // Use local storage fallback if Arweave not configured
        if (this.useLocalStorage) {
            console.log('📦 Using local storage for thumbnail (Arweave not configured)');
            return local_storage_service_1.localStorageService.uploadThumbnail(filePath, videoTitle);
        }
        if (!this.wallet) {
            throw new Error('Arweave wallet not configured');
        }
        try {
            console.log(`📤 Uploading thumbnail to Arweave`);
            const data = fs_1.default.readFileSync(filePath);
            const transaction = await this.arweave.createTransaction({ data }, this.wallet);
            transaction.addTag('Content-Type', this.getContentType(filePath));
            transaction.addTag('App-Name', 'Flix');
            transaction.addTag('Type', 'thumbnail');
            transaction.addTag('Video-Title', videoTitle);
            await this.arweave.transactions.sign(transaction, this.wallet);
            const response = await this.arweave.transactions.post(transaction);
            if (response.status === 200) {
                const transactionId = transaction.id;
                const url = `${config_1.default.arweave.gateway}/${transactionId}`;
                console.log(`✅ Thumbnail uploaded to Arweave: ${transactionId}`);
                return { transactionId, url };
            }
            else {
                throw new Error(`Thumbnail upload failed with status ${response.status}`);
            }
        }
        catch (error) {
            console.error('❌ Arweave thumbnail upload failed:', error);
            throw error;
        }
    }
    /**
     * Get transaction status
     */
    async getTransactionStatus(transactionId) {
        try {
            const status = await this.arweave.transactions.getStatus(transactionId);
            return {
                status: status.status === 200 ? 'confirmed' : 'pending',
                confirmed: status.confirmed?.block_height !== undefined,
                blockHeight: status.confirmed?.block_height,
            };
        }
        catch (error) {
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
    async getBalance() {
        if (!this.wallet) {
            return 0;
        }
        try {
            const address = await this.arweave.wallets.jwkToAddress(this.wallet);
            const balance = await this.arweave.wallets.getBalance(address);
            return parseFloat(this.arweave.ar.winstonToAr(balance));
        }
        catch (error) {
            console.error('Error getting Arweave balance:', error);
            return 0;
        }
    }
    /**
     * Estimate upload cost
     */
    async estimateUploadCost(fileSizeBytes) {
        try {
            const costWinston = await this.arweave.transactions.getPrice(fileSizeBytes);
            const costAr = parseFloat(this.arweave.ar.winstonToAr(costWinston));
            // Get AR price (you'd fetch this from an oracle in production)
            const arPriceUsd = 10; // Placeholder
            return {
                ar: costAr,
                usd: costAr * arPriceUsd,
            };
        }
        catch (error) {
            console.error('Error estimating cost:', error);
            return { ar: 0, usd: 0 };
        }
    }
    /**
     * Get content type from file extension
     */
    getContentType(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const contentTypes = {
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
    getStreamUrl(transactionId) {
        return `${config_1.default.arweave.gateway}/${transactionId}`;
    }
}
exports.ArweaveService = ArweaveService;
exports.arweaveService = new ArweaveService();
