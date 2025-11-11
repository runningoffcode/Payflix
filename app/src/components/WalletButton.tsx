import React from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

/**
 * Styled Wallet Button
 * Uses Privy for authentication
 */
export function WalletButton() {
  const { user: privyUser, login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  const getWalletAddress = (): string | null => {
    if (!privyUser) return null;

    const solanaWallets = wallets?.filter((w: any) => w.walletClientType === 'solana' || w.chainType === 'solana');
    if (solanaWallets && solanaWallets.length > 0) {
      return solanaWallets[0].address;
    }

    const embeddedWallet = privyUser.linkedAccounts?.find(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'solana'
    );
    if (embeddedWallet) {
      return embeddedWallet.address;
    }

    return null;
  };

  const walletAddress = getWalletAddress();
  const connected = authenticated && !!walletAddress;
  const connecting = !ready;

  return (
    <button
      onClick={() => (connected ? logout() : login())}
      disabled={connecting}
      style={{
        background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
        border: 'none',
        borderRadius: '0.5rem',
        padding: '0.5rem 1.5rem',
        fontWeight: '600',
        fontSize: '0.875rem',
        transition: 'opacity 0.2s',
        opacity: connecting ? 0.5 : 1,
        cursor: connecting ? 'not-allowed' : 'pointer',
      }}
    >
      {connecting ? 'Connecting...' : connected ? shortenAddress(walletAddress || '') : 'Connect Wallet'}
    </button>
  );
}

/**
 * Alternative custom wallet button
 */
export function CustomWalletButton() {
  const { user: privyUser, login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  const getWalletAddress = (): string | null => {
    if (!privyUser) return null;

    const solanaWallets = wallets?.filter((w: any) => w.walletClientType === 'solana' || w.chainType === 'solana');
    if (solanaWallets && solanaWallets.length > 0) {
      return solanaWallets[0].address;
    }

    const embeddedWallet = privyUser.linkedAccounts?.find(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'solana'
    );
    if (embeddedWallet) {
      return embeddedWallet.address;
    }

    return null;
  };

  const address = getWalletAddress();
  const connected = authenticated && !!address;
  const connecting = !ready;

  if (connected && address) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 glass-effect px-4 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-white">{shortenAddress(address)}</span>
        </div>
        <button
          onClick={() => logout()}
          className="text-gray-400 hover:text-white transition"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => login()}
      disabled={connecting}
      className="gradient-bg px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition disabled:opacity-50"
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
