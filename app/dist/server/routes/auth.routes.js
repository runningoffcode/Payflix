"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_factory_1 = require("../database/db-factory");
const auth_middleware_1 = require("../middleware/auth.middleware");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/challenge
 * Get a login challenge message to sign with wallet
 */
router.post('/challenge', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }
        // Generate a unique challenge message
        const timestamp = Date.now();
        const nonce = (0, uuid_1.v4)();
        const message = `Sign this message to authenticate with PayFlix\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
        res.json({
            success: true,
            message,
            nonce,
            timestamp,
        });
    }
    catch (error) {
        console.error('Challenge error:', error);
        res.status(500).json({ error: 'Failed to generate challenge' });
    }
});
/**
 * POST /api/auth/login
 * Authenticate with wallet address and get JWT tokens
 */
router.post('/login', async (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }
        // In production, verify the wallet signature here
        // For now, we'll skip signature verification for simplicity
        // Get or create user (all users are creators by default)
        let user = await db_factory_1.db.getUserByWallet(walletAddress);
        if (!user) {
            console.log('🆕 User not found, creating new user...');
            try {
                user = await db_factory_1.db.createUser({
                    walletAddress,
                    isCreator: true, // Everyone is a creator by default
                });
                console.log('✅ User created successfully:', user.id);
            }
            catch (error) {
                console.error('❌ Error creating user:', error);
                return res.status(500).json({ error: 'Failed to create user account' });
            }
        }
        else {
            console.log('✅ Existing user found:', user.id);
            if (!user.isCreator) {
                // Upgrade existing non-creator users to creators automatically
                user = await db_factory_1.db.updateUser(user.id, { isCreator: true }) || user;
            }
        }
        // Generate tokens
        const accessToken = (0, auth_middleware_1.generateAccessToken)(user);
        const refreshToken = (0, auth_middleware_1.generateRefreshToken)(user);
        res.json({
            success: true,
            token: accessToken, // Frontend expects 'token'
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                username: user.username,
                email: user.email || `${user.walletAddress.slice(0, 8)}@flix.temp`,
                role: user.isCreator ? 'creator' : 'viewer',
                isCreator: user.isCreator,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }
        // Verify refresh token (implement proper verification in production)
        // For now, decode and get user
        res.json({
            success: true,
            accessToken: 'new-access-token',
        });
    }
    catch (error) {
        console.error('Refresh error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});
/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', auth_middleware_1.authenticateJWT, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        res.json({
            user: {
                id: req.user.id,
                walletAddress: req.user.walletAddress,
                username: req.user.username,
                email: req.user.email,
                isCreator: req.user.isCreator,
                createdAt: req.user.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
/**
 * POST /api/auth/logout
 * Logout (invalidate refresh token)
 */
router.post('/logout', auth_middleware_1.authenticateJWT, async (req, res) => {
    try {
        // In production, invalidate the refresh token in database
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});
exports.default = router;
