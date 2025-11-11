import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWallet, useConnection } from '../hooks/useWallet';
import { WalletMultiButton } from '../hooks/useWallet';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { fetchTokenMetadata } from '../services/helius-token-metadata.service';
import { queueRPCRequest, RPC_PRIORITY } from '../services/rpc-queue.service';

export default function Navbar() {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const [showDropdown, setShowDropdown] = useState(false);
  const [balances, setBalances] = useState<{ mint: string; balance: number; symbol: string; name: string; logo?: string }[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch wallet balances with RPC queue (prevents rate limiting)
  const fetchBalances = async () => {
    if (!publicKey || !connected) return;

    console.log('🔵 Navbar: Fetching balances (queued)...');
    setLoading(true);
    try {
      // Queue SOL balance fetch with LOW priority
      const solBal = await queueRPCRequest<number>(
        () => connection.getBalance(publicKey),
        RPC_PRIORITY.LOW
      );
      setSolBalance(solBal / LAMPORTS_PER_SOL);

      // Queue token accounts fetch with LOW priority
      const tokenAccounts = await queueRPCRequest<Awaited<ReturnType<typeof connection.getParsedTokenAccountsByOwner>>>(
        () => connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        RPC_PRIORITY.LOW
      );

      const tokensWithBalance: { mint: string; balance: number }[] = [];

      for (const { account } of tokenAccounts.value) {
        const parsedInfo = account.data.parsed.info;
        const balance = parsedInfo.tokenAmount.uiAmount;

        if (balance > 0) {
          tokensWithBalance.push({
            mint: parsedInfo.mint,
            balance,
          });
        }
      }

      // Fetch metadata for all tokens from Helius
      const mintAddresses = tokensWithBalance.map(t => t.mint);
      const metadata = await fetchTokenMetadata(mintAddresses);

      // Combine balance + metadata
      const tokens = tokensWithBalance.map(({ mint, balance }) => {
        const meta = metadata.get(mint);
        return {
          mint,
          balance,
          symbol: meta?.symbol || mint.slice(0, 4) + '...',
          name: meta?.name || 'Unknown Token',
          logo: meta?.logo,
        };
      });

      setBalances(tokens);
      console.log('🔵 Navbar: Found', tokens.length, 'tokens with balances');
    } catch (error: any) {
      console.error('❌ Navbar: Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch balances when dropdown opens
  useEffect(() => {
    if (showDropdown && connected) {
      fetchBalances();
    }
  }, [showDropdown, connected]);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Nftq.</div>
              <div className="text-xs text-gray-500 -mt-1">NFT Marketplace</div>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search Item, Collection and Account.."
                className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 text-gray-700"
              />
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-6">
            <button className="text-gray-600 hover:text-indigo-600 transition font-medium">
              User
            </button>
            <button className="text-gray-600 hover:text-indigo-600 transition font-medium">
              Creator
            </button>

            {/* Notification */}
            <button className="relative p-2 hover:bg-gray-50 rounded-lg transition">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Solana Wallet Connection */}
            {!connected ? (
              <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !rounded-lg !h-auto !px-6 !py-2.5 !text-sm !font-medium !transition" />
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-lg px-6 py-2.5 text-sm font-medium transition text-white flex items-center space-x-2"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>{publicKey ? shortenAddress(publicKey.toBase58()) : 'Unknown'}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                      <div className="text-xs font-medium opacity-80 mb-1">Wallet Address</div>
                      <div className="font-mono text-sm break-all">
                        {publicKey?.toBase58()}
                      </div>
                    </div>

                    {/* Balances */}
                    <div className="p-4">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Token Balances</div>

                      {loading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {/* SOL Balance */}
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">◎</span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">SOL</div>
                                <div className="text-xs text-gray-500">Solana</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {solBalance.toFixed(4)}
                              </div>
                              <div className="text-xs text-gray-500">SOL</div>
                            </div>
                          </div>

                          {/* Token Balances */}
                          {balances.map((token) => (
                            <div
                              key={token.mint}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {token.symbol.slice(0, 1)}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {token.symbol}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate max-w-[120px]">
                                    {token.mint.slice(0, 8)}...
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                  {token.balance.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">{token.symbol}</div>
                              </div>
                            </div>
                          ))}

                          {balances.length === 0 && !loading && (
                            <div className="text-center py-6 text-gray-500 text-sm">
                              No tokens found
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-gray-100 p-4">
                      <button
                        onClick={() => {
                          disconnect();
                          setShowDropdown(false);
                        }}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2.5 rounded-lg transition flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
