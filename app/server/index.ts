// MUST load dotenv FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import config from './config/index';
import { db, initializeDatabase } from './database/db-factory';

// Import routes
import videosRoutes from './routes/videos.routes';
import usersRoutes from './routes/users.routes';
import analyticsRoutes from './routes/analytics.routes';
import authRoutes from './routes/auth.routes';
// OLD: import uploadRoutes from './routes/video-upload.routes';
import uploadRoutes from './routes/video-upload-v2.routes'; // NEW: Bulletproof upload with detailed logging
import facilitatorRoutes from './routes/facilitator.routes';
import paymentsRoutes from './routes/payments.routes';
import sessionsRoutes from './routes/sessions.routes';
import userProfileRoutes from './routes/user-profile.routes';
import storageRoutes from './routes/storage.routes';
import commentsRoutes from './routes/comments.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import digitalIdRoutes from './routes/digital-id.routes';
import telemetryRoutes from './routes/telemetry.routes';
import mcpRoutes from './routes/mcp.routes';
// TODO: Fix these routes to work with Supabase
// import creatorRoutes from './routes/creator.routes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Content Security Policy - Permissive for development
app.use((req, res, next) => {
  if (config.nodeEnv === 'development') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self' https: wss: ws:; " +
      "font-src 'self' data:; " +
      "media-src 'self' blob: https:;"
    );
  }
  next();
});

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
app.use('/api/users', userProfileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/facilitator', facilitatorRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/digital-id', digitalIdRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/mcp', mcpRoutes);
// TODO: Fix these routes to work with Supabase
// app.use('/api/creator', creatorRoutes);

const clientBuildPath = path.join(__dirname, '../client');

if (config.nodeEnv === 'production') {
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

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
      console.log(`📊 Database: ${config.database.useSupabase ? 'Supabase (PostgreSQL)' : config.database.usePostgres ? 'PostgreSQL' : 'In-Memory (Dev)'}`);
      console.log(`🔐 Auth: JWT with ${config.jwt.expiresIn} expiry`);
      console.log(`🤖 AI Agent: ${config.aiAgent.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`💰 Revenue Split: ${config.fees.creatorPercentage}% Creator / ${config.fees.platformPercentage}% Platform`);
      console.log('\n📋 Features:');
      console.log('   ✓ Instant creator monetization');
      console.log('   ✓ No ads for users');
      console.log('   ✓ Real Solana wallet integration (Phantom/Solflare)');
      console.log('   ✓ Cloudflare R2 video storage (zero bandwidth costs)');
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
      console.log('   - POST /api/upload/video                (Upload video to The Flix)');
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
