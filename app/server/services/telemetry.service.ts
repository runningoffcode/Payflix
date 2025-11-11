type DigitalIdInteractionType = 'hover' | 'modal_open';

interface DigitalIdRequestRecord {
  timestamp: string;
  walletAddress: string;
  durationMs: number;
  success: boolean;
}

interface DigitalIdMetrics {
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastWallet?: string;
  lastUpdated?: string;
  interactions: Record<DigitalIdInteractionType, number>;
  recentRequests: DigitalIdRequestRecord[];
}

const metrics: DigitalIdMetrics = {
  totalRequests: 0,
  totalSuccess: 0,
  totalErrors: 0,
  totalDurationMs: 0,
  maxDurationMs: 0,
  interactions: {
    hover: 0,
    modal_open: 0,
  },
  recentRequests: [],
};

const MAX_RECENT = 50;

export function recordDigitalIdRequest(options: {
  walletAddress: string;
  durationMs: number;
  success: boolean;
}) {
  metrics.totalRequests += 1;
  metrics.totalDurationMs += options.durationMs;
  metrics.maxDurationMs = Math.max(metrics.maxDurationMs, options.durationMs);
  metrics.lastWallet = options.walletAddress;
  metrics.lastUpdated = new Date().toISOString();

  if (options.success) {
    metrics.totalSuccess += 1;
  } else {
    metrics.totalErrors += 1;
  }

  metrics.recentRequests.unshift({
    timestamp: metrics.lastUpdated,
    walletAddress: options.walletAddress,
    durationMs: options.durationMs,
    success: options.success,
  });

  if (metrics.recentRequests.length > MAX_RECENT) {
    metrics.recentRequests.length = MAX_RECENT;
  }
}

export function recordDigitalIdInteraction(event: DigitalIdInteractionType) {
  metrics.interactions[event] = (metrics.interactions[event] || 0) + 1;
  metrics.lastUpdated = new Date().toISOString();
}

export function getDigitalIdMetrics() {
  return {
    ...metrics,
    averageDurationMs:
      metrics.totalRequests > 0
        ? Math.round((metrics.totalDurationMs / metrics.totalRequests) * 100) / 100
        : 0,
  };
}
