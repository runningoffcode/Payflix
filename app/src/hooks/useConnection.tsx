import { Connection } from '@solana/web3.js';
import { useMemo } from 'react';

/**
 * Compatibility hook that provides the same interface as @solana/wallet-adapter-react's useConnection
 * but creates a direct connection instead of using the provider
 */
export function useConnection() {
  // Using Helius RPC for better performance and token metadata
  const rpcUrl = 'https://devnet.helius-rpc.com/?api-key=84db05e3-e9ad-479e-923e-80be54938a18';

  const connection = useMemo(
    () => new Connection(rpcUrl, 'confirmed'),
    []
  );

  return { connection };
}
