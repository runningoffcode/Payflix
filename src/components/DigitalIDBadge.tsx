import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { queueRPCRequest, RPC_PRIORITY } from '@/services/rpc-queue.service';
import { fetchTokenMetadata, KNOWN_TOKENS } from '@/services/helius-token-metadata.service';
import { getTokenDisplayInfo } from '@/constants/tokenDisplay';
import { cn } from '@/lib/utils';
import { useDigitalId } from '@/hooks/useDigitalId';
import type { DigitalIdPayment, DigitalIdResponse } from '@/services/digitalId.service';
import { logDigitalIdEvent } from '@/services/telemetry.service';

type DigitalIdBadgeVariant = 'default' | 'compact';

interface DigitalIDBadgeProps {
  creatorWallet?: string;
  videoId?: string;
  className?: string;
  variant?: DigitalIdBadgeVariant;
  lazy?: boolean;
}

interface TokenDisplayItem {
  mint: string;
  balance: number;
  symbol: string;
  name: string;
  logo?: string;
}

export function DigitalIDBadge({
  creatorWallet,
  videoId,
  className,
  variant = 'default',
  lazy = false,
}: DigitalIDBadgeProps) {
  const [activated, setActivated] = useState(!lazy);
  const { data, loading, error } = useDigitalId(creatorWallet, videoId, activated);
  const [hovered, setHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tokenItems, setTokenItems] = useState<TokenDisplayItem[] | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const { connection } = useConnection();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lazy || activated) return;
    if (typeof IntersectionObserver === 'undefined') {
      setActivated(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setActivated(true);
      }
    }, { threshold: 0.4 });

    const node = containerRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) {
        observer.unobserve(node);
      }
      observer.disconnect();
    };
  }, [lazy, activated]);

  const formattedWallet = useMemo(() => {
    if (!creatorWallet) return '';
    return `${creatorWallet.slice(0, 4)}...${creatorWallet.slice(-4)}`;
  }, [creatorWallet]);

  const latestPayment = data?.recentPayments?.[0] ?? null;

  const safeOpenModal = () => {
    if (!creatorWallet || variant === 'compact') return;
    logDigitalIdEvent('modal_open');
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  useEffect(() => {
    let cancelled = false;
    async function loadTokens() {
      if (!modalOpen || !creatorWallet || !connection) return;
      setTokenLoading(true);
      try {
        const owner = new PublicKey(creatorWallet);
        const accounts = await queueRPCRequest(
          () => connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
          RPC_PRIORITY.LOW
        );

        const balances = accounts.value
          .map(({ account }) => {
            const parsed = account.data.parsed.info;
            const balance = parsed.tokenAmount.uiAmount;
            return {
              mint: parsed.mint as string,
              balance: typeof balance === 'number' ? balance : parseFloat(balance || '0'),
            };
          })
          .filter((item) => item.balance > 0);

        if (!balances.length) {
          if (!cancelled) {
            setTokenItems([]);
          }
          return;
        }

        const metadataMap = await fetchTokenMetadata(balances.map((item) => item.mint));

        if (!cancelled) {
          setTokenItems(
            balances
              .slice(0, 6)
              .map((item) => {
                const override = getTokenDisplayInfo(item.mint);
                const known = KNOWN_TOKENS[item.mint];
                const metadata = metadataMap.get(item.mint);
                return {
                  mint: item.mint,
                  balance: item.balance,
                  symbol: override?.symbol || metadata?.symbol || known?.symbol || item.mint.slice(0, 4),
                  name:
                    override?.name ||
                    metadata?.name ||
                    known?.name ||
                    `${item.mint.slice(0, 4)}...${item.mint.slice(-4)}`,
                  logo: override?.logo || metadata?.logo,
                };
              })
          );
        }
      } catch (tokenError) {
        console.warn('Unable to load creator token metadata', tokenError);
        if (!cancelled) {
          setTokenItems([]);
        }
      } finally {
        if (!cancelled) {
          setTokenLoading(false);
        }
      }
    }

    loadTokens();

    return () => {
      cancelled = true;
    };
  }, [connection, creatorWallet, modalOpen]);

  useEffect(() => {
    if (hovered && activated) {
      logDigitalIdEvent('hover');
    }
  }, [hovered, activated]);

  if (!creatorWallet) {
    return null;
  }

  const tooltipContent = () => {
    if (loading) {
      return <p className="text-sm text-neutral-300">Loading Digital ID…</p>;
    }
    if (error) {
      return <p className="text-sm text-red-400">{error}</p>;
    }
    if (!data) {
      return <p className="text-sm text-neutral-300">No digital identity data</p>;
    }

    return (
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Wallet</p>
          <p className="font-mono text-white">{formattedWallet}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Latest verification</p>
          <p className="text-white">
            {data.highlights.latestPaymentAt
              ? formatRelativeTime(data.highlights.latestPaymentAt)
              : 'Awaiting first payment'}
          </p>
        </div>
        {data.viewerContext?.session && (
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Your session</p>
            {data.viewerContext.session.hasSession ? (
              <p className="text-white">
                {formatCurrency(data.viewerContext.session.remainingAmount || 0)} remaining
              </p>
            ) : (
              <p className="text-white">No active session</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleMouseEnter = () => {
    setActivated(true);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  const handleFocus = () => {
    setActivated(true);
    setHovered(true);
  };

  const handleBlur = () => setHovered(false);

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={cn(
          'rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-purple-400/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
          loading && 'opacity-70'
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={safeOpenModal}
      >
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Digital ID
          <span className="font-mono tracking-normal">{formattedWallet}</span>
        </span>
      </button>

      {hovered && (
        <div
          role={variant === 'compact' ? undefined : 'button'}
          tabIndex={variant === 'compact' ? undefined : 0}
          onClick={variant === 'compact' ? undefined : safeOpenModal}
          onKeyDown={
            variant === 'compact'
              ? undefined
              : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    safeOpenModal();
                  }
                }
          }
          className="absolute z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-left shadow-2xl backdrop-blur focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-neutral-900 cursor-pointer"
        >
          {tooltipContent()}
        </div>
      )}

      {modalOpen && data && variant === 'default' && (
        <DigitalIdModal
          data={data}
          tokens={{ items: tokenItems, loading: tokenLoading }}
          onClose={closeModal}
          recentPayment={latestPayment}
        />
      )}
    </div>
  );
}

interface DigitalIdModalProps {
  data: DigitalIdResponse;
  tokens: { items: TokenDisplayItem[] | null; loading: boolean };
  onClose: () => void;
  recentPayment: DigitalIdPayment | null;
}

function DigitalIdModal({ data, tokens, onClose, recentPayment }: DigitalIdModalProps) {
  if (!data || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-neutral-950/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Digital Identity</p>
            <h2 className="mt-2 text-3xl font-semibold">
              {data.creator.username || data.creator.walletAddress}
            </h2>
            {data.creator.bio && (
              <p className="mt-2 text-neutral-400 max-w-2xl">{data.creator.bio}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-400">
              <span className="rounded-full border border-white/10 px-3 py-1">
                Wallet: {shortWallet(data.creator.walletAddress)}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Joined:{' '}
                {data.creator.joinedAt ? new Date(data.creator.joinedAt).toLocaleDateString() : 'N/A'}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                {data.stats.totalSubscribers.toLocaleString()} subscribers
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 p-2 text-white/70 transition hover:border-white hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">24h Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">
              {formatCurrency(data.analytics24h.revenue)}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {data.analytics24h.views.toLocaleString()} paid views
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Videos</p>
            <p className="mt-2 text-2xl font-semibold text-white">{data.stats.totalVideos}</p>
            <p className="mt-1 text-xs text-neutral-400">
              Avg price {formatCurrency(data.stats.averagePrice || 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Lifetime</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatCurrency(data.stats.lifetimeEarnings)}
            </p>
            <p className="mt-1 text-xs text-neutral-400">Total verified payouts</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/60 via-neutral-900 to-neutral-950 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent Verified Payouts</h3>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                {data.recentPayments.length} records
              </p>
            </div>
            <div className="mt-4 space-y-4">
              {data.recentPayments.length === 0 && (
                <p className="text-sm text-neutral-400">No verified payouts yet.</p>
              )}
              {data.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {payment.video?.title || 'Untitled Video'}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {payment.verifiedAt
                          ? formatRelativeTime(payment.verifiedAt)
                          : 'Pending verification'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                      <a
                        className="text-xs text-purple-300 hover:text-purple-200"
                        href={`https://explorer.solana.com/tx/${payment.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Solana
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">On-chain Assets</h3>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                Live lookup
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {tokens.loading && <p className="text-sm text-neutral-400">Loading assets…</p>}
              {!tokens.loading && tokens.items && tokens.items.length === 0 && (
                <p className="text-sm text-neutral-400">
                  No public token balances were detected for this wallet.
                </p>
              )}
              {!tokens.loading &&
                tokens.items?.map((token) => (
                  <div
                    key={token.mint}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      {token.logo ? (
                        <img src={token.logo} alt={token.symbol} className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-purple-500/40 text-center leading-8 text-white">
                          {token.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">{token.name}</p>
                        <p className="text-xs text-neutral-400">{shortWallet(token.mint)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
                      {token.symbol}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {recentPayment && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">
            Latest payout of {formatCurrency(recentPayment.amount)} verified{' '}
            {recentPayment.verifiedAt
              ? formatRelativeTime(recentPayment.verifiedAt)
              : 'recently'}
            .
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function shortWallet(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}
