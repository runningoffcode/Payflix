import { usePrivy, useWallets } from '@privy-io/react-auth';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { useMemo, useState, useCallback } from 'react';

/**
 * Compatibility hook that provides the same interface as @solana/wallet-adapter-react's useWallet
 * but uses Privy under the hood
 */
export function useWallet() {
  const { user: privyUser, authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();

  const solanaWallet = useMemo(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets.find((w: any) => w.walletClientType === 'solana' || w.chainType === 'solana') || null;
  }, [wallets]);

  const walletAddress = useMemo(() => {
    if (solanaWallet) {
      return solanaWallet.address;
    }

    const embeddedWallet = privyUser?.linkedAccounts?.find(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'solana'
    );

    return embeddedWallet?.address || null;
  }, [privyUser, solanaWallet]);

  const publicKey = useMemo(() => (walletAddress ? new PublicKey(walletAddress) : null), [walletAddress]);
  const connected = authenticated && !!walletAddress;
  const connecting = !ready;

  const signTransaction = solanaWallet?.signTransaction
    ? async (tx: Transaction) => solanaWallet.signTransaction(tx)
    : undefined;

  const signAllTransactions = solanaWallet?.signAllTransactions
    ? async (txs: Transaction[]) => solanaWallet.signAllTransactions(txs)
    : undefined;

  const sendTransaction = solanaWallet?.signAndSendTransaction
    ? async (tx: Transaction, options?: any) => solanaWallet.signAndSendTransaction(tx, options)
    : undefined;

  const signMessage = solanaWallet?.signMessage
    ? async (message: Uint8Array) => solanaWallet.signMessage(message)
    : undefined;

  const ensureWalletSigner = useCallback(async () => {
    if (signTransaction || sendTransaction) {
      return true;
    }

    try {
      await login();
    } catch (error) {
      console.warn('Privy login attempt failed while requesting signer', error);
    }

    return false;
  }, [login, signTransaction, sendTransaction]);

  return {
    publicKey,
    walletAddress,
    connected,
    connecting,
    disconnecting: false,
    wallet: solanaWallet || null,
    wallets: wallets || [],
    select: () => {},
    connect: () => login(),
    disconnect: () => Promise.resolve(),
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage,
    ensureWalletSigner,
  };
}

/**
 * Compatibility hook for useConnection
 */
export function useConnection() {
  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  console.log('🔗 RPC URL being used:', rpcUrl);

  const connection = useMemo(() => new Connection(rpcUrl, 'confirmed'), [rpcUrl]);

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
