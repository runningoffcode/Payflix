import { Request } from 'express';

export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  isCreator: boolean;
  createdAt: Date;
}

export interface Video {
  id: string;
  creatorId: string;
  creatorWallet: string;
  title: string;
  description: string;
  priceUsdc: number;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  views: number;
  earnings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  videoId: string;
  userId: string;
  userWallet: string;
  creatorWallet: string;
  amount: number;
  creatorAmount: number;
  platformAmount: number;
  transactionSignature: string;
  status: 'pending' | 'verified' | 'failed';
  verifiedAt?: Date;
  createdAt: Date;
}

export interface X402Challenge {
  videoId: string;
  priceUsdc: number;
  creatorWallet: string;
  platformWallet: string;
  timestamp: number;
  nonce: string;
}

export interface X402PaymentProof {
  videoId: string;
  transactionSignature: string;
  userWallet: string;
  timestamp: number;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface VideoAccess {
  userId: string;
  videoId: string;
  expiresAt: Date;
  paymentId: string;
}
