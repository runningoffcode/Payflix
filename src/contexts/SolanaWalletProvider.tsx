import React from 'react';

interface Props {
  children: React.ReactNode;
}

/**
 * Solana Wallet Provider (Simplified)
 * Simplified wrapper - Solana wallet integration is handled by WalletContext
 */
export function SolanaWalletProvider({ children }: Props) {
  // For now, we're using the simplified WalletContext approach
  // This can be enhanced later with full @solana/wallet-adapter integration
  return <>{children}</>;
}
