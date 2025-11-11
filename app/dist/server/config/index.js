"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Force override existing environment variables with .env file values
dotenv_1.default.config({ override: true });
exports.config = {
    port: parseInt(process.env.PORT || '5001'),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        usePostgres: process.env.USE_POSTGRES === 'true',
        useSupabase: process.env.USE_SUPABASE === 'true',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        name: process.env.DB_NAME || 'flix',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        network: process.env.SOLANA_NETWORK || 'devnet',
        platformWalletPrivateKey: process.env.PLATFORM_WALLET_PRIVATE_KEY || '',
        platformFeeWallet: process.env.PLATFORM_FEE_WALLET || '',
        usdcMintAddress: process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    fees: {
        platformPercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2.85'),
        creatorPercentage: parseFloat(process.env.CREATOR_FEE_PERCENTAGE || '97.15'),
    },
    storage: {
        videoPath: process.env.VIDEO_STORAGE_PATH || './storage/videos',
        uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5000000000'),
    },
    aiAgent: {
        enabled: process.env.AI_AGENT_ENABLED === 'true',
        verificationThreshold: parseFloat(process.env.AI_VERIFICATION_THRESHOLD || '0.95'),
    },
    arweave: {
        host: process.env.ARWEAVE_HOST || 'arweave.net',
        port: parseInt(process.env.ARWEAVE_PORT || '443'),
        protocol: process.env.ARWEAVE_PROTOCOL || 'https',
        gateway: process.env.ARWEAVE_GATEWAY || 'https://arweave.net',
        walletPath: process.env.ARWEAVE_WALLET_PATH || '',
        walletKey: process.env.ARWEAVE_WALLET_KEY || '',
    },
    r2: {
        endpoint: process.env.R2_ENDPOINT || '',
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        bucketName: process.env.R2_BUCKET_NAME || '',
        publicUrl: process.env.R2_PUBLIC_URL || '',
    },
};
exports.default = exports.config;
