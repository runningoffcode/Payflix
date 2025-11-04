interface TokenIconProps {
  mint: string;
  symbol: string;
  className?: string;
}

export default function TokenIcon({ mint, symbol, className = "w-8 h-8" }: TokenIconProps) {
  // Known token logos with actual image URLs
  const KNOWN_TOKENS: { [key: string]: { name: string; logoUrl: string } } = {
    // USDC Mainnet
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
      name: 'USDC',
      logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
    },
    // USDC Devnet (Circle)
    '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': {
      name: 'USDC',
      logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
    },
    // USDC Devnet (Solana Labs)
    'DRXxfmg3PEk5Ad6DKuGSfa93ZLHDzXJKxcnjaAUGmW3z': {
      name: 'USDC',
      logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
    },
    // USDC Devnet (Alternative)
    '9zB1qKtTs7A1rbDpj15fsVrN1MrFxFSyRgBF8hd2fDX2': {
      name: 'USDC',
      logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
    },
    // USDT
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
      name: 'USDT',
      logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg'
    },
    // SOL (native)
    'So11111111111111111111111111111111111111112': {
      name: 'SOL',
      logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111112/logo.png'
    },
  };

  const tokenInfo = KNOWN_TOKENS[mint];

  // Display known token logos as actual images
  if (tokenInfo) {
    return (
      <img
        src={tokenInfo.logoUrl}
        alt={tokenInfo.name}
        className={`${className} rounded-full object-cover`}
        onError={(e) => {
          // Fallback if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.nextElementSibling) {
            (target.nextElementSibling as HTMLElement).style.display = 'flex';
          }
        }}
      />
    );
  }

  // Fallback for unknown tokens - show first letter with gradient
  const gradients = [
    'from-cyan-500 to-blue-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500',
    'from-yellow-500 to-orange-500',
    'from-indigo-500 to-purple-500',
  ];

  // Use mint address to consistently pick a gradient
  const gradientIndex = parseInt(mint.slice(0, 8), 36) % gradients.length;
  const gradient = gradients[gradientIndex];

  return (
    <div className={`${className} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <span className="text-white text-xs font-bold">
        {symbol.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}
