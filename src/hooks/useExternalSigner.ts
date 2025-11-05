import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

/**
 * Hook that links an external Solana wallet (Phantom/Backpack) exactly once
 * and caches the signer so we stop re-opening the Privy modal.
 */
export function useExternalSigner() {
  const { linkWallet } = usePrivy();
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
    console.log('   current wallets count:', walletsRef.current?.length || 0);

    try {
      console.log('🔗 Calling linkWallet({ chain: "solana" })...');
      await linkWallet?.({ chain: 'solana' });

      const MAX_ATTEMPTS = 10;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        console.log(`🔍 Attempt ${attempt + 1}/${MAX_ATTEMPTS} - searching for signer...`);
        console.log('   walletsRef.current:', walletsRef.current?.length || 0, 'wallets');

        const candidate = findSigner(walletsRef.current);
        if (candidate) {
          console.log('✅ Found signer candidate:', {
            address: candidate.address?.substring(0, 10) + '...',
            chainType: candidate.chainType || candidate.walletClientType,
            hasSignTransaction: !!candidate.signTransaction,
            hasSignAndSendTransaction: !!candidate.signAndSendTransaction,
          });

          try {
            await candidate.connect?.();
          } catch (error) {
            console.warn('⚠️  External wallet connect warning:', error);
          }
          setSigner(candidate);
          return candidate;
        }

        if (attempt === 0 && typeof refresh === 'function') {
          console.log('🔄 Calling refresh() to update wallet list...');
          try {
            await refresh();
            console.log('   ✅ refresh() completed');
          } catch (error) {
            console.warn('⚠️  Unable to refresh Privy wallets snapshot:', error);
          }
        } else if (attempt === 0) {
          console.warn('⚠️  refresh() function not available in Privy SDK');
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      console.error('❌ No signer found after 10 attempts');
      throw new Error('External wallet did not expose a signer. Approve in Phantom and try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, linkWallet, refresh, signer]);

  return {
    signer,
    busy,
    connectExternal,
  };
}
