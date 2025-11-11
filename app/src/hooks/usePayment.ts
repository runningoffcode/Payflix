// ============================================
// FLIX BACKEND - PAYMENT HOOK
// ============================================
// React hook for payment and unlock operations

import { useState } from 'react';
import type { PaymentMethod } from '../types/supabase';
import * as paymentService from '../services/payment.service';

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockVideo = async (videoId: string, paymentMethod: PaymentMethod = 'mock') => {
    setLoading(true);
    setError(null);

    const result = await paymentService.unlockVideo(videoId, paymentMethod);

    if (result.error) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  };

  const checkVideoUnlocked = async (videoId: string, userId: string) => {
    const result = await paymentService.isVideoUnlocked(videoId, userId);
    return result.data || false;
  };

  return {
    unlockVideo,
    checkVideoUnlocked,
    loading,
    error,
  };
}
