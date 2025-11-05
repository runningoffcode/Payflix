import { usePrivy, useWallets } from '@privy-io/react-auth';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { useMemo, useState, useCallback, useEffect } from 'react';

/**
 * Compatibility hook that provides the same interface as @solana/wallet-adapter-react's useWallet
 * but uses Privy under the hood
 */
export function useWallet() {
  const { user: privyUser, authenticated, ready, login, linkWallet } = usePrivy();
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

  useEffect(() => {
    if (!wallets || wallets.length === 0) {
      console.log('🪪 Privy wallets: none connected');
      return;
    }

    const snapshot = wallets.map((wallet: any) => ({
      id: wallet.id,
      address: wallet.address,
      chainType: wallet.chainType,
      walletClientType: wallet.walletClientType,
      hasSignTransaction: typeof wallet.signTransaction === 'function',
      hasSignAndSendTransaction: typeof wallet.signAndSendTransaction === 'function',
    }));

    console.log('🪪 Privy wallets snapshot:', snapshot);
  }, [wallets]);

  const ensureWalletSigner = useCallback(async () => {
    if (signTransaction || sendTransaction) {
      return true;
    }

    console.log('🔐 Wallet signer missing — attempting Privy wallet link...', {
      authenticated,
      walletAddress,
    });

    if (!authenticated) {
      try {
        await login();
      } catch (error) {
        console.warn('Privy login attempt failed while requesting signer', error);
        return false;
      }
    }

    if (typeof linkWallet !== 'function') {
      console.warn('Privy linkWallet helper not available');
      return false;
    }

    try {
      await linkWallet({ chain: 'solana' });
    } catch (error) {
      console.warn('Privy wallet link failed', error);
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    const latestWallet =
      wallets?.find((w: any) => w.walletClientType === 'solana' || w.chainType === 'solana') || null;

    const hasSigner =
      !!latestWallet?.signTransaction || !!latestWallet?.signAndSendTransaction;

    console.log('🔐 Wallet signer availability after link attempt:', {
      hasSigner,
      hasSignTransaction: !!latestWallet?.signTransaction,
      hasSignAndSendTransaction: !!latestWallet?.signAndSendTransaction,
    });

    return hasSigner;
  }, [authenticated, linkWallet, login, sendTransaction, signTransaction, walletAddress, wallets]);

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
