import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  fetchSubscriptions,
  fetchSubscriptionSummary,
  subscribeToCreator,
  unsubscribeFromCreator,
  type SubscriptionEntry,
  type SubscriptionSummary,
} from '@/services/subscriptions.service';
import { SUBSCRIPTIONS_UPDATED_EVENT } from '@/utils/subscriptionEvents';

function useWalletAddress() {
  const { publicKey } = useWallet();
  return publicKey?.toBase58();
}

export function useSubscriptions(enabled: boolean = true) {
  const walletAddress = useWalletAddress();
  const [subscriptions, setSubscriptions] = useState<SubscriptionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !walletAddress) {
      setSubscriptions([]);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchSubscriptions(walletAddress);
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled, walletAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(SUBSCRIPTIONS_UPDATED_EVENT, handler as EventListener);
    return () => window.removeEventListener(SUBSCRIPTIONS_UPDATED_EVENT, handler as EventListener);
  }, [refresh]);

  const subscribedWallets = useMemo(() => {
    return new Set(subscriptions.map((sub) => sub.creatorWallet));
  }, [subscriptions]);

  return {
    subscriptions,
    subscribedWallets,
    loading,
    refresh,
  };
}

export function useSubscriptionStatus(creatorWallet?: string) {
  const walletAddress = useWalletAddress();
  const [summary, setSummary] = useState<SubscriptionSummary>({
    subscriberCount: 0,
    isSubscribed: false,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!creatorWallet) {
      setSummary({ subscriberCount: 0, isSubscribed: false });
      return;
    }

    setLoading(true);
    try {
      const data = await fetchSubscriptionSummary(creatorWallet, walletAddress);
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch subscription summary:', error);
    } finally {
      setLoading(false);
    }
  }, [creatorWallet, walletAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail || !creatorWallet) return;
      if (detail.creatorWallet === creatorWallet) {
        refresh();
      }
    };

    window.addEventListener(SUBSCRIPTIONS_UPDATED_EVENT, handler as EventListener);
    return () => window.removeEventListener(SUBSCRIPTIONS_UPDATED_EVENT, handler as EventListener);
  }, [creatorWallet, refresh]);

  return {
    summary,
    loading,
    refresh,
    async subscribe() {
      if (!creatorWallet || !walletAddress) {
        throw new Error('Wallet not connected');
      }
      const data = await subscribeToCreator(walletAddress, creatorWallet);
      setSummary(data);
      return data;
    },
    async unsubscribe() {
      if (!creatorWallet || !walletAddress) {
        throw new Error('Wallet not connected');
      }
      const data = await unsubscribeFromCreator(walletAddress, creatorWallet);
      setSummary(data);
      return data;
    },
  };
}
