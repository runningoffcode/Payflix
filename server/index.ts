import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import config from './config';
import { db } from './database';

// Import routes
import videosRoutes from './routes/videos.routes';
import usersRoutes from './routes/users.routes';
import analyticsRoutes from './routes/analytics.routes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/videos', videosRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);

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
    // Initialize sample data
    await db.initializeSampleData();

    app.listen(config.port, () => {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║                                                            ║');
      console.log('║                  🎬 FLIX VIDEO PLATFORM                    ║');
      console.log('║              X402 Payment Protocol on Solana               ║');
      console.log('║                                                            ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`🌐 API: http://localhost:${config.port}/api`);
      console.log(`💳 Protocol: X402 with USDC on Solana`);
      console.log(`🤖 AI Agent: Enabled for payment verification`);
      console.log(`💰 Revenue Split: ${config.fees.creatorPercentage}% Creator / ${config.fees.platformPercentage}% Platform`);
      console.log('\n📋 Features:');
      console.log('   ✓ Instant creator monetization');
      console.log('   ✓ No ads for users');
      console.log('   ✓ Instant payments via x402');
      console.log('   ✓ AI-powered payment verification');
      console.log('   ✓ Automatic revenue splitting');
      console.log('\n🔗 Endpoints:');
      console.log('   - GET  /health                          (Health check)');
      console.log('   - GET  /api/videos                      (List videos)');
      console.log('   - GET  /api/videos/:id                  (Video details)');
      console.log('   - GET  /api/videos/:id/stream           (Stream video - 402 protected)');
      console.log('   - POST /api/videos/:id/verify-payment   (Verify payment)');
      console.log('   - POST /api/users/connect-wallet        (Connect wallet)');
      console.log('   - GET  /api/users/profile               (User profile)');
      console.log('   - POST /api/users/become-creator        (Become creator)');
      console.log('   - GET  /api/analytics/platform          (Platform stats)');
      console.log('\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
