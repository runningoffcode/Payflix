// ============================================
// FLIX BACKEND - CREATOR STATS HOOK
// ============================================
// React hook for creator analytics and dashboard data

import { useState, useEffect } from 'react';
import type { CreatorStats, CreatorAnalytics } from '../types/supabase';
import * as analyticsService from '../services/analytics.service';
import { supabase } from '../lib/supabase';

export function useCreatorStats(creatorId: string) {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (creatorId) {
      fetchStats();

      // Subscribe to real-time updates
      const subscription = supabase
        .channel(`creator_stats:${creatorId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'creator_stats',
            filter: `creator_id=eq.${creatorId}`,
          },
          (payload) => {
            if (payload.new) {
              setStats(payload.new as CreatorStats);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [creatorId]);

  async function fetchStats() {
    setLoading(true);
    setError(null);

    const result = await analyticsService.getCreatorStats(creatorId);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setStats(result.data);
    }

    setLoading(false);
  }

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

export function useCreatorAnalytics(creatorId: string) {
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (creatorId) {
      fetchAnalytics();
    }
  }, [creatorId]);

  async function fetchAnalytics() {
    setLoading(true);
    setError(null);

    const result = await analyticsService.getCreatorAnalytics(creatorId);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setAnalytics(result.data);
    }

    setLoading(false);
  }

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

export function useCreatorTransactions(creatorId: string, limit: number = 10) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (creatorId) {
      fetchTransactions();
    }
  }, [creatorId, limit]);

  async function fetchTransactions() {
    setLoading(true);
    setError(null);

    const result = await analyticsService.getCreatorTransactions(creatorId, limit);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setTransactions(result.data);
    }

    setLoading(false);
  }

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
}
