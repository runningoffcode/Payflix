export interface TokenDisplayInfo {
  symbol: string;
  name: string;
  logo: string;
}

// Canonical token branding sourced from the Solana Labs token list CDN.
export const TOKEN_DISPLAY_OVERRIDES: Record<string, TokenDisplayInfo> = {
  // Solana native token (works across devnet/mainnet)
  'So11111111111111111111111111111111111111112': {
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  // USDC mainnet
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  // USDC devnet variants
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  'DRXxfmg3PEk5Ad6DKuGSfa93ZLHDzXJKxcnjaAUGmW3z': {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  '9zB1qKtTs7A1rbDpj15fsVrN1MrFxFSyRgBF8hd2fDX2': {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
};

export const getTokenDisplayInfo = (mint: string): TokenDisplayInfo | undefined =>
  TOKEN_DISPLAY_OVERRIDES[mint];
