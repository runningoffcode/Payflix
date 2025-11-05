import { usePrivy, useWallets } from '@privy-io/react-auth';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { useMemo, useState, useCallback, useEffect } from 'react';

/**
 * Compatibility hook that provides the same interface as @solana/wallet-adapter-react's useWallet
 * but uses Privy under the hood
 */
export function useWallet() {
  const privy = usePrivy() as any;
  const {
    user: privyUser,
    authenticated,
    ready,
    login,
    linkWallet,
    getWallets,
  } = privy;
  const { wallets } = useWallets();

  const [linkedWalletOverride, setLinkedWalletOverride] = useState<any>(null);
  const [walletRefreshNonce, setWalletRefreshNonce] = useState(0);

  const solanaWallet = useMemo(() => {
    const walletFromHook = wallets?.find(
      (w: any) => w.walletClientType === 'solana' || w.chainType === 'solana'
    );

    if (walletFromHook) {
      return walletFromHook;
    }

    if (linkedWalletOverride) {
      return linkedWalletOverride;
    }

    return null;
  }, [linkedWalletOverride, walletRefreshNonce, wallets]);

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
      linked: wallet.linked ?? true,
      hasConnect: typeof wallet.connect === 'function',
      hasSignTransaction: typeof wallet.signTransaction === 'function',
      hasSignAndSendTransaction: typeof wallet.signAndSendTransaction === 'function',
    }));

    console.log('🪪 Privy wallets snapshot:', snapshot);
  }, [wallets]);

  const ensureWalletSigner = useCallback(async () => {
    if (signTransaction || sendTransaction) {
      return true;
    }

    console.log('🔐 Wallet signer missing — starting Privy wallet flow...', {
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

    const resolveWallet = async () => {
      const candidate = wallets?.find(
        (w: any) => w.walletClientType === 'solana' || w.chainType === 'solana'
      );
      if (candidate) return candidate;

      if (linkedWalletOverride) return linkedWalletOverride;

      if (typeof getWallets === 'function') {
        try {
          console.log('📬 Fetching latest Privy wallets...');
          const fetched = await getWallets();
          if (fetched && fetched.length > 0) {
            const fetchedSolana = fetched.find(
              (w: any) => w?.walletClientType === 'solana' || w?.chainType === 'solana'
            ) || fetched[0];
            if (fetchedSolana) {
              setLinkedWalletOverride(fetchedSolana);
              return fetchedSolana;
            }
          }
        } catch (error) {
          console.warn('Privy getWallets failed', error);
        }
      }

      return null;
    };

    let targetWallet = await resolveWallet();

    const embedAccount = privyUser?.linkedAccounts?.find(
      (acc: any) => acc?.type === 'wallet' && acc?.chainType === 'solana'
    );

    if (!targetWallet && embedAccount && typeof privy?.linkEmbeddedWallet === 'function') {
      try {
        console.log('🔗 Linking embedded Solana wallet via Privy...');
        await privy.linkEmbeddedWallet({ chain: 'solana' });
        targetWallet = await resolveWallet();
      } catch (error) {
        console.warn('Privy linkEmbeddedWallet failed', error);
      }
    }

    if (!targetWallet && typeof linkWallet === 'function') {
      try {
        console.log('🔗 Linking new Solana wallet via Privy...');
        await linkWallet({ chain: 'solana' });
        targetWallet = await resolveWallet();
      } catch (error) {
        console.warn('Privy wallet link failed', error);
        return false;
      }
    }

    if (!targetWallet) {
      console.warn('❌ No Solana wallet found after link attempt');
      if (embedAccount) {
        console.warn('⚠️ Embedded wallet detected but no signer client available');
      }
      return false;
    }

    try {
      const solanaProvider = await targetWallet.getSolanaProvider?.();
      if (solanaProvider?.connect) {
        console.log('🔌 Connecting Solana provider...');
        await solanaProvider.connect({ onlyIfTrusted: false });
      }

      if (targetWallet.connect) {
        console.log('🔌 Connecting Privy wallet client...');
        await targetWallet.connect();
      }
    } catch (error) {
      console.warn('❌ Wallet connect rejected or failed', error);
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    setWalletRefreshNonce((nonce) => nonce + 1);

    const refreshedWallet =
      wallets?.find((w: any) => w.walletClientType === 'solana' || w.chainType === 'solana') ||
      targetWallet;

    const hasSigner =
      !!refreshedWallet?.signTransaction || !!refreshedWallet?.signAndSendTransaction;

    console.log('🔐 Wallet signer availability after connect:', {
      hasSigner,
      hasSignTransaction: !!refreshedWallet?.signTransaction,
      hasSignAndSendTransaction: !!refreshedWallet?.signAndSendTransaction,
    });

    if (!hasSigner) {
      console.warn('⚠️  Wallet connected but signer still unavailable');
    }

    return hasSigner;
  }, [
    authenticated,
    linkWallet,
    linkedWalletOverride,
    getWallets,
    privy,
    privyUser,
    login,
    sendTransaction,
    signTransaction,
    walletAddress,
    wallets,
  ]);

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
