import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import config from './config/index';
import { db, initializeDatabase } from './database/db-factory';

// Import routes
import videosRoutes from './routes/videos.routes';
import usersRoutes from './routes/users.routes';
import analyticsRoutes from './routes/analytics.routes';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/video-upload.routes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Flix',
    version: '1.0.0',
    protocol: 'x402',
    blockchain: 'Solana',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Initialize sample data if using in-memory database
    if (!config.database.usePostgres && db.initializeSampleData) {
      await db.initializeSampleData();
    }

    app.listen(config.port, () => {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║                                                            ║');
      console.log('║                  🎬 FLIX VIDEO PLATFORM v2.0               ║');
      console.log('║              X402 Payment Protocol on Solana               ║');
      console.log('║                                                            ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`🌐 API: http://localhost:${config.port}/api`);
      console.log(`💳 Protocol: X402 with USDC on Solana`);
      console.log(`📊 Database: ${config.database.usePostgres ? 'PostgreSQL' : 'In-Memory (Dev)'}`);
      console.log(`🔐 Auth: JWT with ${config.jwt.expiresIn} expiry`);
      console.log(`🤖 AI Agent: ${config.aiAgent.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`💰 Revenue Split: ${config.fees.creatorPercentage}% Creator / ${config.fees.platformPercentage}% Platform`);
      console.log('\n📋 Features:');
      console.log('   ✓ Instant creator monetization');
      console.log('   ✓ No ads for users');
      console.log('   ✓ Real Solana wallet integration (Phantom/Solflare)');
      console.log('   ✓ Arweave decentralized video storage');
      console.log('   ✓ JWT authentication');
      console.log('   ✓ PostgreSQL support');
      console.log('   ✓ AI-powered payment verification');
      console.log('   ✓ Automatic revenue splitting');
      console.log('\n🔗 Endpoints:');
      console.log('   AUTH:');
      console.log('   - POST /api/auth/login                  (Login with wallet)');
      console.log('   - GET  /api/auth/me                     (Get current user)');
      console.log('   VIDEOS:');
      console.log('   - GET  /api/videos                      (List videos)');
      console.log('   - GET  /api/videos/:id/stream           (Stream video - 402 protected)');
      console.log('   - POST /api/videos/:id/verify-payment   (Verify payment)');
      console.log('   UPLOAD:');
      console.log('   - POST /api/upload/video                (Upload video to Arweave)');
      console.log('   - GET  /api/upload/status/:id           (Check upload status)');
      console.log('   USERS:');
      console.log('   - POST /api/users/connect-wallet        (Connect wallet)');
      console.log('   - POST /api/users/become-creator        (Become creator)');
      console.log('   ANALYTICS:');
      console.log('   - GET  /api/analytics/platform          (Platform stats)');
      console.log('\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
