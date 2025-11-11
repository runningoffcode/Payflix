/**
 * Helius Token Metadata Service
 * Fetches token metadata including logos, names, and symbols from Helius Advanced API
 */

const HELIUS_API_KEY = '84db05e3-e9ad-479e-923e-80be54938a18';
const HELIUS_METADATA_API = `https://api-devnet.helius-rpc.com/v0/token-metadata`;

export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  logo?: string;
  decimals: number;
}

// In-memory cache to avoid repeated API calls
const metadataCache = new Map<string, TokenMetadata>();

/**
 * Fetch token metadata from Helius Advanced API
 */
export async function fetchTokenMetadata(mintAddresses: string[]): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();
  const uncachedMints: string[] = [];

  // Check cache first
  for (const mint of mintAddresses) {
    const cached = metadataCache.get(mint);
    if (cached) {
      results.set(mint, cached);
    } else {
      uncachedMints.push(mint);
    }
  }

  // If all tokens are cached, return immediately
  if (uncachedMints.length === 0) {
    return results;
  }

  try {
    console.log(`🔍 Fetching metadata for ${uncachedMints.length} tokens from Helius...`);

    const response = await fetch(`${HELIUS_METADATA_API}?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mintAccounts: uncachedMints,
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Helius metadata API error:', response.status);
      return results;
    }

    const data = await response.json();

    // Process results
    for (const tokenData of data) {
      if (tokenData.account) {
        const metadata: TokenMetadata = {
          mint: tokenData.account,
          name: tokenData.onChainMetadata?.metadata?.data?.name || 'Unknown Token',
          symbol: tokenData.onChainMetadata?.metadata?.data?.symbol || tokenData.account.slice(0, 4),
          logo: tokenData.offChainMetadata?.metadata?.image || undefined,
          decimals: tokenData.onChainAccountInfo?.decimals || 6,
        };

        // Cache the result
        metadataCache.set(metadata.mint, metadata);
        results.set(metadata.mint, metadata);

        console.log(`✅ Loaded metadata for ${metadata.symbol} (${metadata.name})`);
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error fetching token metadata:', error);
    return results;
  }
}

/**
 * Get cached metadata or return default
 */
export function getCachedMetadata(mint: string): TokenMetadata | null {
  return metadataCache.get(mint) || null;
}

/**
 * Known token addresses for quick lookups
 */
export const KNOWN_TOKENS: Record<string, Partial<TokenMetadata>> = {
  // Devnet USDC (custom test token)
  '9zB1qKtTs7A1rbDpj15fsVrN1MrFxFSyRgBF8hd2fDX2': {
    name: 'USD Coin (Test)',
    symbol: 'USDC',
    decimals: 6,
  },
  // Another common devnet USDC
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': {
    name: 'USD Coin (Devnet)',
    symbol: 'USDC',
    decimals: 6,
  },
  // Official devnet USDC
  'DRXxfmg3PEk5Ad6DKuGSfa93ZLHDzXJKxcnjaAUGmW3z': {
    name: 'USD Coin (Official Devnet)',
    symbol: 'USDC',
    decimals: 6,
  },
  // SOL (native token)
  'So11111111111111111111111111111111111111112': {
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
  },
};

/**
 * Get token metadata with fallback to known tokens
 */
export async function getTokenMetadata(mintAddress: string): Promise<TokenMetadata> {
  // Check cache first
  const cached = getCachedMetadata(mintAddress);
  if (cached) {
    return cached;
  }

  // Check known tokens
  const known = KNOWN_TOKENS[mintAddress];
  if (known) {
    const metadata: TokenMetadata = {
      mint: mintAddress,
      name: known.name || 'Unknown Token',
      symbol: known.symbol || mintAddress.slice(0, 4),
      decimals: known.decimals || 6,
      logo: known.logo,
    };
    metadataCache.set(mintAddress, metadata);
    return metadata;
  }

  // Fetch from Helius
  const results = await fetchTokenMetadata([mintAddress]);
  const fetched = results.get(mintAddress);

  if (fetched) {
    return fetched;
  }

  // Fallback to basic metadata
  const fallback: TokenMetadata = {
    mint: mintAddress,
    name: 'Unknown Token',
    symbol: mintAddress.slice(0, 4) + '...',
    decimals: 6,
  };

  return fallback;
}
