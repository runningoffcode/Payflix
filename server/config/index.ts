import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    network: process.env.SOLANA_NETWORK || 'devnet',
    platformWalletPrivateKey: process.env.PLATFORM_WALLET_PRIVATE_KEY || '',
    usdcMintAddress: process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  fees: {
    platformPercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2.35'),
    creatorPercentage: parseFloat(process.env.CREATOR_FEE_PERCENTAGE || '97.65'),
  },

  storage: {
    videoPath: process.env.VIDEO_STORAGE_PATH || './storage/videos',
    uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '500000000'),
  },

  aiAgent: {
    enabled: process.env.AI_AGENT_ENABLED === 'true',
    verificationThreshold: parseFloat(process.env.AI_VERIFICATION_THRESHOLD || '0.95'),
  },
};

export default config;
