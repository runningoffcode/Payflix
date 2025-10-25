import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

/**
 * Styled Wallet Button
 * Uses the Solana wallet adapter's built-in button with custom styling
 */
export function WalletButton() {
  return (
    <WalletMultiButton
      style={{
        background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
        border: 'none',
        borderRadius: '0.5rem',
        padding: '0.5rem 1.5rem',
        fontWeight: '600',
        fontSize: '0.875rem',
        transition: 'opacity 0.2s',
      }}
    />
  );
}

/**
 * Alternative custom wallet button
 */
export function CustomWalletButton() {
  const { connect, disconnect, connected, connecting, address } = useSolanaWallet();

  if (connected && address) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 glass-effect px-4 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-white">{shortenAddress(address)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="text-gray-400 hover:text-white transition"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
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

// Re-export the hook for convenience
import { useSolanaWallet } from '../hooks/useSolanaWallet';
