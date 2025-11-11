import { SUBSCRIPTIONS_UPDATED_EVENT } from '@/utils/subscriptionEvents';

export interface SubscriptionCreatorInfo {
  id?: string;
  walletAddress?: string;
  username?: string | null;
  profilePictureUrl?: string | null;
  bio?: string | null;
}

export interface SubscriptionEntry {
  id: string;
  subscriberWallet: string;
  creatorWallet: string;
  subscribedAt: string;
  creator?: SubscriptionCreatorInfo;
}

export interface SubscriptionSummary {
  subscriberCount: number;
  isSubscribed: boolean;
}

function withWalletHeader(walletAddress?: string): HeadersInit {
  return walletAddress
    ? {
        'x-wallet-address': walletAddress,
      }
    : {};
}

export async function fetchSubscriptions(walletAddress: string): Promise<SubscriptionEntry[]> {
  const response = await fetch('/api/subscriptions', {
    headers: {
      ...withWalletHeader(walletAddress),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load subscriptions');
  }

  const data = await response.json();
  return data.subscriptions || [];
}

export async function subscribeToCreator(
  subscriberWallet: string,
  creatorWallet: string
): Promise<SubscriptionSummary> {
  const response = await fetch('/api/subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withWalletHeader(subscriberWallet),
    },
    body: JSON.stringify({ creatorWallet }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to subscribe');
  }

  const data = await response.json();
  dispatchSubscriptionEvent(creatorWallet);
  return {
    subscriberCount: data.subscriberCount ?? 0,
    isSubscribed: true,
  };
}

export async function unsubscribeFromCreator(
  subscriberWallet: string,
  creatorWallet: string
): Promise<SubscriptionSummary> {
  const response = await fetch(`/api/subscriptions/${creatorWallet}`, {
    method: 'DELETE',
    headers: {
      ...withWalletHeader(subscriberWallet),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to unsubscribe');
  }

  const data = await response.json();
  dispatchSubscriptionEvent(creatorWallet);
  return {
    subscriberCount: data.subscriberCount ?? 0,
    isSubscribed: false,
  };
}

export async function fetchSubscriptionSummary(
  creatorWallet: string,
  viewerWallet?: string
): Promise<SubscriptionSummary> {
  const response = await fetch(`/api/subscriptions/${creatorWallet}/summary`, {
    headers: {
      ...withWalletHeader(viewerWallet),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch subscription summary');
  }

  const data = await response.json();
  return {
    subscriberCount: data.subscriberCount ?? 0,
    isSubscribed: Boolean(data.isSubscribed),
  };
}

export function dispatchSubscriptionEvent(creatorWallet: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SUBSCRIPTIONS_UPDATED_EVENT, {
      detail: { creatorWallet },
    })
  );
}
