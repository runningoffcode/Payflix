import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

/**
 * Hook that links an external Solana wallet (Phantom/Backpack) exactly once
 * and caches the signer so we stop re-opening the Privy modal.
 */
export function useExternalSigner() {
  const privy = usePrivy() as any;
  const { linkWallet, wallets: privyWalletsApi } = privy;
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

    let linkedWallet: any | null = null;

    try {
      linkedWallet = await linkWallet?.({ chain: 'solana' });
      if (canSign(linkedWallet)) {
        try {
          await linkedWallet.connect?.();
        } catch (error) {
          console.warn('⚠️  External wallet connect warning:', error);
        }
        setSigner(linkedWallet);
        return linkedWallet;
      }

      const MAX_ATTEMPTS = 10;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {

        const candidate =
          findSigner(walletsRef.current) ||
          findSigner(privyWalletsApi?.list ? await privyWalletsApi.list() : undefined);

        if (candidate) {
          try {
            await candidate.connect?.();
          } catch (error) {
            console.warn('⚠️  External wallet connect warning:', error);
          }
          setSigner(candidate);
          return candidate;
        }

        if (attempt === 0 && typeof refresh === 'function') {
          try {
            await refresh();
          } catch (error) {
            console.warn('⚠️  Unable to refresh Privy wallets snapshot:', error);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      throw new Error('External wallet did not expose a signer. Approve in Phantom and try again.');
    } catch (error) {
      throw error;
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
