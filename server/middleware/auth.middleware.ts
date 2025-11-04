import { Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthRequest, User } from '../types';
import config from '../config/index';
import { db } from '../database';

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

interface JWTPayload {
  userId: string;
  walletAddress: string;
  iat: number;
  exp: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: User): string {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as any,
  };
  return jwt.sign(
    {
      userId: user.id,
      walletAddress: user.walletAddress,
    },
    config.jwt.secret,
    options
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(user: User): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as any,
  };
  return jwt.sign(
    {
      userId: user.id,
      walletAddress: user.walletAddress,
    },
    config.jwt.refreshSecret,
    options
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Middleware to authenticate requests with JWT
 * Checks for token in Authorization header or x-auth-token header
 */
export async function authenticateJWT(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : req.headers['x-auth-token'] as string;

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Verify token
    const payload = verifyToken(token);

    // Get user from database
    const user = await db.getUserById(payload.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware to authenticate requests with wallet address
 * Fallback for when JWT is not available (legacy support)
 */
export async function authenticateWallet(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      res.status(401).json({ error: 'Wallet address required' });
      return;
    }

    // Get or create user (all users are creators by default)
    let user = await db.getUserByWallet(walletAddress);

    if (!user) {
      // Auto-create user on first request as creator
      user = await db.createUser({
        walletAddress,
        isCreator: true, // Everyone is a creator by default
      });
    } else if (!user.isCreator) {
      // Upgrade existing non-creator users to creators automatically
      user = await db.updateUser(user.id, { isCreator: true }) || user;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication - doesn't fail if no auth provided
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try JWT first
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : req.headers['x-auth-token'] as string;

    if (token) {
      const payload = verifyToken(token);
      const user = await db.getUserById(payload.userId);
      if (user) {
        req.user = user;
      }
    } else {
      // Try wallet address
      const walletAddress = req.headers['x-wallet-address'] as string;
      if (walletAddress) {
        const user = await db.getUserByWallet(walletAddress);
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Require creator role
 */
export function requireCreator(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
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
export async function validateWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
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
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}
