/**
 * Compatibility layer for @solana/wallet-adapter-react
 * Provides the same hooks but uses Privy under the hood
 */

export { useWallet } from './useWallet';
export { useConnection } from './useConnection';

// Re-export other commonly used wallet adapter modules
export * from '@solana/wallet-adapter-base';
