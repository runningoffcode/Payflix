// ============================================
// FLIX BACKEND - PAYMENT SERVICE
// ============================================
// Handles payments, transactions, and video unlocks

import { supabase } from '../lib/supabase';
import type {
  Transaction,
  ApiResponse,
  PaymentMethod,
  TransactionStatus,
} from '../types/supabase';

// ============================================
// UNLOCK VIDEO (Mock Payment)
// ============================================

export async function unlockVideo(
  videoId: string,
  paymentMethod: PaymentMethod = 'mock'
): Promise<ApiResponse<Transaction>> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'You must be logged in to unlock videos' };
    }

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, price, creator_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return { data: null, error: 'Video not found' };
    }

    // Check if user is the creator (creators have free access)
    if (video.creator_id === user.id) {
      return { data: null, error: 'You cannot unlock your own video' };
    }

    // Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from('video_unlocks')
      .select('id')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single();

    if (existingUnlock) {
      return { data: null, error: 'You have already unlocked this video' };
    }

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        video_id: videoId,
        creator_id: video.creator_id,
        amount: video.price,
        status: 'pending',
        payment_method: paymentMethod,
      })
      .select()
      .single();

    if (transactionError) {
      return { data: null, error: transactionError.message };
    }

    // Process mock payment (in production, integrate real payment gateway)
    const paymentResult = await processMockPayment(transaction.id, video.price);

    if (!paymentResult.success) {
      // Update transaction to failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return { data: null, error: paymentResult.error || 'Payment failed' };
    }

    // Update transaction to completed
    const { data: completedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        transaction_hash: paymentResult.transaction_hash,
      })
      .eq('id', transaction.id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // Create video unlock record
    const { error: unlockError } = await supabase.from('video_unlocks').insert({
      user_id: user.id,
      video_id: videoId,
      transaction_id: transaction.id,
    });

    if (unlockError) {
      return { data: null, error: unlockError.message };
    }

    return {
      data: completedTransaction,
      error: null,
      message: 'Video unlocked successfully!',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to unlock video' };
  }
}

// ============================================
// PROCESS MOCK PAYMENT (Simulated)
// ============================================

async function processMockPayment(
  transactionId: string,
  amount: number
): Promise<{ success: boolean; error?: string; transaction_hash?: string }> {
  // Mock payment success (90% success rate for simulation)
  const isSuccess = Math.random() > 0.1;

  if (isSuccess) {
    return {
      success: true,
      transaction_hash: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
  } else {
    return {
      success: false,
      error: 'Mock payment failed - insufficient funds (simulated)',
    };
  }
}

// ============================================
// PROCESS STRIPE PAYMENT (Placeholder)
// ============================================

export async function processStripePayment(
  videoId: string,
  amount: number
): Promise<ApiResponse<string>> {
  // Placeholder for Stripe integration
  // In production, create Stripe payment intent here

  try {
    // Example Stripe integration:
    /*
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, amount }),
    });

    const { clientSecret } = await response.json();
    return { data: clientSecret, error: null };
    */

    return {
      data: null,
      error: 'Stripe integration not yet implemented',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Stripe payment failed' };
  }
}

// ============================================
// PROCESS SOLANA PAYMENT (Placeholder)
// ============================================

export async function processSolanaPayment(
  videoId: string,
  amount: number,
  creatorWallet: string
): Promise<ApiResponse<string>> {
  // Placeholder for Solana Pay integration
  // In production, create Solana transaction here

  try {
    // Example Solana Pay integration:
    /*
    const connection = new Connection(clusterApiUrl('devnet'));
    const transaction = new Transaction();
    // Add transfer instruction
    // Sign and send transaction
    */

    return {
      data: null,
      error: 'Solana Pay integration not yet implemented',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Solana payment failed' };
  }
}

// ============================================
// GET TRANSACTION BY ID
// ============================================

export async function getTransaction(
  transactionId: string
): Promise<ApiResponse<Transaction>> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch transaction' };
  }
}

// ============================================
// GET USER TRANSACTIONS
// ============================================

export async function getUserTransactions(
  userId: string,
  limit: number = 20
): Promise<ApiResponse<Transaction[]>> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || 'Failed to fetch transactions',
    };
  }
}

// ============================================
// REFUND TRANSACTION
// ============================================

export async function refundTransaction(
  transactionId: string
): Promise<ApiResponse<Transaction>> {
  try {
    // Get transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      return { data: null, error: 'Transaction not found' };
    }

    // Check if transaction can be refunded
    if (transaction.status !== 'completed') {
      return { data: null, error: 'Only completed transactions can be refunded' };
    }

    // Update transaction status
    const { data: refundedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({ status: 'refunded' })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // Remove video unlock
    await supabase
      .from('video_unlocks')
      .delete()
      .eq('transaction_id', transactionId);

    // Note: In production, process actual refund through payment gateway

    return {
      data: refundedTransaction,
      error: null,
      message: 'Transaction refunded successfully',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to refund transaction' };
  }
}

// ============================================
// CHECK IF VIDEO IS UNLOCKED
// ============================================

export async function isVideoUnlocked(
  videoId: string,
  userId: string
): Promise<ApiResponse<boolean>> {
  try {
    // Check if user is creator
    const { data: video } = await supabase
      .from('videos')
      .select('creator_id, price')
      .eq('id', videoId)
      .single();

    if (video?.creator_id === userId) {
      return { data: true, error: null };
    }

    // Check if video is free
    if (video?.price === 0) {
      return { data: true, error: null };
    }

    // Check if user has unlocked it
    const { data: unlock, error } = await supabase
      .from('video_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      return { data: null, error: error.message };
    }

    return { data: !!unlock, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to check unlock status' };
  }
}

// ============================================
// GET CREATOR EARNINGS SUMMARY
// ============================================

export async function getCreatorEarnings(
  creatorId: string
): Promise<
  ApiResponse<{
    total_earnings: number;
    pending_earnings: number;
    completed_earnings: number;
    total_transactions: number;
  }>
> {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('amount, status')
      .eq('creator_id', creatorId);

    if (error) {
      return { data: null, error: error.message };
    }

    const summary = {
      total_earnings: 0,
      pending_earnings: 0,
      completed_earnings: 0,
      total_transactions: transactions?.length || 0,
    };

    transactions?.forEach((t) => {
      const amount = Number(t.amount);
      if (t.status === 'completed') {
        summary.completed_earnings += amount;
        summary.total_earnings += amount;
      } else if (t.status === 'pending') {
        summary.pending_earnings += amount;
      }
    });

    return { data: summary, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch earnings' };
  }
}
