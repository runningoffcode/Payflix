"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.authenticateJWT = authenticateJWT;
exports.authenticateWallet = authenticateWallet;
exports.optionalAuth = optionalAuth;
exports.requireCreator = requireCreator;
exports.validateWalletSignature = validateWalletSignature;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = __importDefault(require("../config/index"));
const database_1 = require("../database");
/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
    const options = {
        expiresIn: index_1.default.jwt.expiresIn,
    };
    return jsonwebtoken_1.default.sign({
        userId: user.id,
        walletAddress: user.walletAddress,
    }, index_1.default.jwt.secret, options);
}
/**
 * Generate JWT refresh token
 */
function generateRefreshToken(user) {
    const options = {
        expiresIn: index_1.default.jwt.refreshExpiresIn,
    };
    return jsonwebtoken_1.default.sign({
        userId: user.id,
        walletAddress: user.walletAddress,
    }, index_1.default.jwt.refreshSecret, options);
}
/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, index_1.default.jwt.secret);
    }
    catch (error) {
        throw new Error('Invalid token');
    }
}
/**
 * Middleware to authenticate requests with JWT
 * Checks for token in Authorization header or x-auth-token header
 */
async function authenticateJWT(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : req.headers['x-auth-token'];
        if (!token) {
            console.warn('[auth] missing Authorization token');
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        // Verify token
        let payload;
        try {
            payload = verifyToken(token);
        }
        catch (err) {
            console.warn('[auth] invalid token', err?.message || err);
            throw err;
        }
        // Get user from database
        let user = await database_1.db.getUserById(payload.userId);
        if (!user) {
            if (payload.walletAddress) {
                console.warn('[auth] user id missing, attempting wallet recovery', {
                    userId: payload.userId,
                    wallet: payload.walletAddress,
                });
                user = await database_1.db.getUserByWallet(payload.walletAddress);
                if (!user) {
                    console.info('[auth] creating user during auth recovery', {
                        wallet: payload.walletAddress,
                    });
                    try {
                        user = await database_1.db.createUser({
                            walletAddress: payload.walletAddress,
                            username: undefined,
                            email: undefined,
                            isCreator: true,
                        });
                    }
                    catch (creationError) {
                        console.error('[auth] failed to create user during recovery', creationError);
                        res.status(401).json({ error: 'User recovery failed' });
                        return;
                    }
                }
            }
            if (!user) {
                console.warn('[auth] user not found after recovery attempts', {
                    userId: payload.userId,
                    wallet: payload.walletAddress,
                });
                res.status(401).json({ error: 'User not found' });
                return;
            }
        }
        // Attach user to request
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
/**
 * Middleware to authenticate requests with wallet address
 * Fallback for when JWT is not available (legacy support)
 */
async function authenticateWallet(req, res, next) {
    try {
        const walletAddress = req.headers['x-wallet-address'];
        if (!walletAddress) {
            res.status(401).json({ error: 'Wallet address required' });
            return;
        }
        // Get or create user (all users are creators by default)
        let user = await database_1.db.getUserByWallet(walletAddress);
        if (!user) {
            // Auto-create user on first request as creator
            user = await database_1.db.createUser({
                walletAddress,
                isCreator: true, // Everyone is a creator by default
            });
        }
        else if (!user.isCreator) {
            // Upgrade existing non-creator users to creators automatically
            user = await database_1.db.updateUser(user.id, { isCreator: true }) || user;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
}
/**
 * Optional authentication - doesn't fail if no auth provided
 */
async function optionalAuth(req, res, next) {
    try {
        // Try JWT first
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : req.headers['x-auth-token'];
        if (token) {
            const payload = verifyToken(token);
            const user = await database_1.db.getUserById(payload.userId);
            if (user) {
                req.user = user;
            }
        }
        else {
            // Try wallet address
            const walletAddress = req.headers['x-wallet-address'];
            if (walletAddress) {
                const user = await database_1.db.getUserByWallet(walletAddress);
                if (user) {
                    req.user = user;
                }
            }
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
}
/**
 * Require creator role
 */
function requireCreator(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (!req.user.isCreator) {
        res.status(403).json({ error: 'Creator access required' });
        return;
    }
    next();
}
/**
 * Validate Solana wallet signature
 * For more secure authentication using cryptographic signatures
 */
async function validateWalletSignature(walletAddress, signature, message) {
    try {
        // In production, implement actual Solana signature verification
        // using @solana/web3.js and nacl
        // For now, basic validation
        if (!walletAddress || !signature || !message) {
            return false;
        }
        // Signature should be 88 characters (base58 encoded)
        if (signature.length !== 88) {
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('Signature validation error:', error);
        return false;
    }
}
