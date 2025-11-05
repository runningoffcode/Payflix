import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

/**
 * Hook that links an external Solana wallet (Phantom/Backpack) exactly once
 * and caches the signer so we stop re-opening the Privy modal.
 */
export function useExternalSigner() {
  const privy = usePrivy() as any;
  const { linkWallet, getWallets, wallets: privyWalletsApi } = privy;
  const walletsContext = useWallets() as {
    wallets: any[];
    refresh?: () => Promise<void>;
  };
  const { wallets, refresh } = walletsContext;
  const [signer, setSigner] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const walletsRef = useRef<any[]>(wallets || []);

  useEffect(() => {
    walletsRef.current = wallets || [];
  }, [wallets]);

  const canSign = (wallet: any) =>
    !!wallet && (typeof wallet.signTransaction === 'function' || typeof wallet.signAndSendTransaction === 'function');

  const findSigner = (candidates: any[]): any | null => {
    if (!candidates) return null;
    return (
      candidates.find((w: any) => canSign(w) && (w.walletClientType === 'solana' || w.chain === 'solana')) ||
      candidates.find((w: any) => canSign(w))
    );
  };

  const connectExternal = useCallback(async () => {
    if (busy) return signer;
    if (canSign(signer)) return signer;

    setBusy(true);
    console.log('🔗 useExternalSigner: Starting external wallet connection...');
    console.log('   refresh function available:', typeof refresh === 'function');
    console.log('   privyWalletsApi.list available:', typeof privyWalletsApi?.list === 'function');
    console.log('   current wallets count:', walletsRef.current?.length || 0);

    let linkedWallet: any | null = null;

    try {
      console.log('🔗 Calling linkWallet({ chain: "solana" })...');
      linkedWallet = await linkWallet?.({ chain: 'solana' });

      console.log('   linkWallet returned:', !!linkedWallet);

      // Wait for Privy to process the link
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Call getWallets() to force fetch latest wallets
      if (typeof getWallets === 'function') {
        try {
          console.log('🔄 Calling getWallets() after link...');
          const fetchedWallets = await getWallets();
          console.log('   getWallets() returned:', fetchedWallets?.length || 0, 'wallets');

          const freshSigner = findSigner(fetchedWallets);
          if (freshSigner) {
            console.log('✅ Found signer via getWallets()!');
            try {
              await freshSigner.connect?.();
            } catch (error) {
              console.warn('⚠️  Signer connect warning:', error);
            }
            setSigner(freshSigner);
            return freshSigner;
          }
        } catch (error) {
          console.warn('⚠️  getWallets() failed:', error);
        }
      }

      // Check if linkWallet itself returned a signer
      if (linkedWallet && canSign(linkedWallet)) {
        console.log('✅ linkWallet returned a signer directly!');
        try {
          await linkedWallet.connect?.();
        } catch (error) {
          console.warn('⚠️  linkedWallet connect warning:', error);
        }
        setSigner(linkedWallet);
        return linkedWallet;
      }

      // Try getSolanaProvider() as fallback
      if (linkedWallet && typeof linkedWallet.getSolanaProvider === 'function') {
        try {
          console.log('🔄 Trying getSolanaProvider()...');
          const provider = await linkedWallet.getSolanaProvider();

          if (provider && (provider.signTransaction || provider.signAndSendTransaction)) {
            console.log('✅ Got signer from getSolanaProvider()!');

            // Wrap provider in wallet object format
            const wrappedSigner = {
              ...linkedWallet,
              signTransaction: provider.signTransaction?.bind(provider),
              signAndSendTransaction: provider.signAndSendTransaction?.bind(provider),
            };

            setSigner(wrappedSigner);
            return wrappedSigner;
          }
        } catch (error) {
          console.warn('⚠️  getSolanaProvider() failed:', error);
        }
      }

      const MAX_ATTEMPTS = 20;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        console.log(`🔍 Attempt ${attempt + 1}/${MAX_ATTEMPTS}`);

        let candidate = null;

        // Source 1: walletsRef.current
        candidate = findSigner(walletsRef.current);
        if (candidate) {
          console.log('✅ Found in walletsRef');
        }

        // Source 2: privyWalletsApi.list (guarded)
        if (!candidate && privyWalletsApi?.list) {
          try {
            const apiWallets = await privyWalletsApi.list();
            candidate = findSigner(apiWallets);
            if (candidate) console.log('✅ Found in privyWalletsApi.list');
          } catch (error) {
            // Silent - avoid log spam
          }
        }

        // Source 3: wallets context
        if (!candidate && wallets && wallets.length > 0) {
          candidate = findSigner(wallets);
          if (candidate) console.log('✅ Found in wallets context');
        }

        if (candidate) {
          console.log('   Signer details:', {
            address: candidate.address?.substring(0, 10) + '...',
            chainType: candidate.chainType || candidate.walletClientType,
            hasSignTransaction: !!candidate.signTransaction,
            hasSignAndSendTransaction: !!candidate.signAndSendTransaction,
          });

          try {
            await candidate.connect?.();
          } catch (error) {
            console.warn('⚠️  Connect warning:', error);
          }
          setSigner(candidate);
          return candidate;
        }

        // Refresh once on first attempt
        if (attempt === 0 && typeof refresh === 'function') {
          try {
            await refresh();
          } catch (error) {
            // Silent
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      console.error('❌ No signer found after 20 attempts (3 seconds)');
      throw new Error('Wallet linked but signer not ready. Please refresh and try again.');
    } catch (error) {
      throw error;
    } finally {
      setBusy(false);
    }
  }, [busy, linkWallet, getWallets, privyWalletsApi, refresh, signer, wallets]);

  return {
    signer,
    busy,
    connectExternal,
  };
}
