import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { DIGITAL_ID_UPDATED_EVENT } from '@/utils/digitalIdEvents';
import { fetchDigitalId, type DigitalIdResponse } from '@/services/digitalId.service';

export function useDigitalId(
  creatorWallet?: string,
  videoId?: string,
  enabled: boolean = true
) {
  const { publicKey } = useWallet();
  const viewerWallet = publicKey?.toBase58() || null;

  const [data, setData] = useState<DigitalIdResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!creatorWallet || !enabled) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchDigitalId(creatorWallet, { viewerWallet, videoId });
      setData(payload);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load digital identity');
    } finally {
      setLoading(false);
    }
  }, [creatorWallet, viewerWallet, videoId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handler = () => refresh();
    window.addEventListener('sessionUpdated', handler as EventListener);
    window.addEventListener(DIGITAL_ID_UPDATED_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener('sessionUpdated', handler as EventListener);
      window.removeEventListener(DIGITAL_ID_UPDATED_EVENT, handler as EventListener);
    };
  }, [refresh, enabled]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
