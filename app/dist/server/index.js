"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MUST load dotenv FIRST before any other imports
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ override: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("./config/index"));
const db_factory_1 = require("./database/db-factory");
// Import routes
const videos_routes_1 = __importDefault(require("./routes/videos.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
// OLD: import uploadRoutes from './routes/video-upload.routes';
const video_upload_v2_routes_1 = __importDefault(require("./routes/video-upload-v2.routes")); // NEW: Bulletproof upload with detailed logging
const facilitator_routes_1 = __importDefault(require("./routes/facilitator.routes"));
const payments_routes_1 = __importDefault(require("./routes/payments.routes"));
const sessions_routes_1 = __importDefault(require("./routes/sessions.routes"));
const user_profile_routes_1 = __importDefault(require("./routes/user-profile.routes"));
const storage_routes_1 = __importDefault(require("./routes/storage.routes"));
const comments_routes_1 = __importDefault(require("./routes/comments.routes"));
const subscriptions_routes_1 = __importDefault(require("./routes/subscriptions.routes"));
const digital_id_routes_1 = __importDefault(require("./routes/digital-id.routes"));
const telemetry_routes_1 = __importDefault(require("./routes/telemetry.routes"));
const mcp_routes_1 = __importDefault(require("./routes/mcp.routes"));
// TODO: Fix these routes to work with Supabase
// import creatorRoutes from './routes/creator.routes';
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
// Content Security Policy - Permissive for development
app.use((req, res, next) => {
    if (index_1.default.nodeEnv === 'development') {
        res.setHeader('Content-Security-Policy', "default-src 'self'; " +
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob: https:; " +
            "connect-src 'self' https: wss: ws:; " +
            "font-src 'self' data:; " +
            "media-src 'self' blob: https:;");
    }
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
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
app.use('/api/auth', auth_routes_1.default);
app.use('/api/videos', videos_routes_1.default);
app.use('/api/users', users_routes_1.default);
app.use('/api/users', user_profile_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/upload', video_upload_v2_routes_1.default);
app.use('/api/facilitator', facilitator_routes_1.default);
app.use('/api/payments', payments_routes_1.default);
app.use('/api/sessions', sessions_routes_1.default);
app.use('/api/storage', storage_routes_1.default);
app.use('/api/comments', comments_routes_1.default);
app.use('/api/subscriptions', subscriptions_routes_1.default);
app.use('/api/digital-id', digital_id_routes_1.default);
app.use('/api/telemetry', telemetry_routes_1.default);
app.use('/api/mcp', mcp_routes_1.default);
// TODO: Fix these routes to work with Supabase
// app.use('/api/creator', creatorRoutes);
const clientBuildPath = path_1.default.join(__dirname, '../client');
if (index_1.default.nodeEnv === 'production') {
    app.use(express_1.default.static(clientBuildPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/health') {
            return next();
        }
        res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
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
app.use((err, req, res, next) => {
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
        await (0, db_factory_1.initializeDatabase)();
        // Initialize sample data if using in-memory database
        if (!index_1.default.database.usePostgres && db_factory_1.db.initializeSampleData) {
            await db_factory_1.db.initializeSampleData();
        }
        app.listen(index_1.default.port, () => {
            console.log('\n╔════════════════════════════════════════════════════════════╗');
            console.log('║                                                            ║');
            console.log('║                  🎬 FLIX VIDEO PLATFORM v2.0               ║');
            console.log('║              X402 Payment Protocol on Solana               ║');
            console.log('║                                                            ║');
            console.log('╚════════════════════════════════════════════════════════════╝\n');
            console.log(`🚀 Server running on port ${index_1.default.port}`);
            console.log(`🌐 API: http://localhost:${index_1.default.port}/api`);
            console.log(`💳 Protocol: X402 with USDC on Solana`);
            console.log(`📊 Database: ${index_1.default.database.useSupabase ? 'Supabase (PostgreSQL)' : index_1.default.database.usePostgres ? 'PostgreSQL' : 'In-Memory (Dev)'}`);
            console.log(`🔐 Auth: JWT with ${index_1.default.jwt.expiresIn} expiry`);
            console.log(`🤖 AI Agent: ${index_1.default.aiAgent.enabled ? 'Enabled' : 'Disabled'}`);
            console.log(`💰 Revenue Split: ${index_1.default.fees.creatorPercentage}% Creator / ${index_1.default.fees.platformPercentage}% Platform`);
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
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
