import { useEffect, useState, useRef } from 'react';
import {
  fetchTrendingHighlights,
  type TrendingHighlightsResponse,
} from '../services/trending.service';

const DEFAULT_POLL_INTERVAL = 60_000;

export function useTrendingHighlights(pollInterval: number = DEFAULT_POLL_INTERVAL) {
  const [data, setData] = useState<TrendingHighlightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!isMounted) return;
      setLoading(true);
      const response = await fetchTrendingHighlights();
      if (!isMounted) return;
      if (response) {
        setData(response);
        setError(null);
      } else {
        setError('Unable to load trending data');
      }
      setLoading(false);
    };

    load();

    if (pollInterval > 0) {
      timerRef.current = setInterval(load, pollInterval);
    }

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [pollInterval]);

  return { data, loading, error };
}
