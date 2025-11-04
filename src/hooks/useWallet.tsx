import { usePrivy, useWallets } from '@privy-io/react-auth';
import { PublicKey, Connection } from '@solana/web3.js';
import { useMemo, useState } from 'react';

/**
 * Compatibility hook that provides the same interface as @solana/wallet-adapter-react's useWallet
 * but uses Privy under the hood
 */
export function useWallet() {
  const { user: privyUser, authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();

  // Get Solana wallet address from Privy (connected wallet OR embedded wallet)
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
  const publicKey = walletAddress ? new PublicKey(walletAddress) : null;
  const connected = authenticated && !!walletAddress;
  const connecting = !ready;

  return {
    publicKey,
    connected,
    connecting,
    disconnecting: false,
    wallet: null,
    wallets: [],
    select: () => {},
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    sendTransaction: () => Promise.resolve(''),
    signTransaction: undefined,
    signAllTransactions: undefined,
    signMessage: undefined,
  };
}

/**
 * Compatibility hook for useConnection
 */
export function useConnection() {
  // Using Helius RPC for better performance and token metadata
  const rpcUrl = 'https://devnet.helius-rpc.com/?api-key=84db05e3-e9ad-479e-923e-80be54938a18';
  console.log('🔗 RPC URL being used:', rpcUrl);

  const connection = useMemo(
    () => new Connection(rpcUrl, 'confirmed'),
    []
  );

  return { connection };
}

/**
 * Compatibility hook for useWalletModal
 */
export function useWalletModal() {
  const { login } = usePrivy();
  const [visible, setVisible] = useState(false);

  // When visible changes to true, trigger Privy login
  useMemo(() => {
    if (visible) {
      login();
      setVisible(false); // Reset
    }
  }, [visible, login]);

  return {
    visible,
    setVisible,
  };
}
