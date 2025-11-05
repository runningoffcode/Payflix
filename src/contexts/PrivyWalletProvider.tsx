import { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

interface Props {
  children: ReactNode;
}

/**
 * Privy Wallet Provider
 * Unified authentication supporting:
 * - Crypto wallets (Phantom, Solflare, etc.)
 * - Email/password login
 * - Social logins (Google, Twitter, Discord, etc.)
 * - Embedded Solana wallets for non-crypto users
 */
export function PrivyWalletProvider({ children }: Props) {
  // Initialize Solana wallet connectors
  const solanaConnectors = toSolanaWalletConnectors({
    // Disable auto-connect to prevent unwanted popup on page load
    shouldAutoConnect: false,
  });

  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || 'YOUR_PRIVY_APP_ID'}
      config={{
        // Logo and branding
        appearance: {
          theme: 'dark',
          accentColor: '#C56BCE',
          logo: '/payflix-logo.png',
          // Only show Phantom and Solflare in the wallet list
          walletList: ['phantom', 'solflare'],
          showWalletLoginFirst: true,
          walletChainType: 'solana-only', // Focus on Solana wallets
        },

        // Login methods
        loginMethods: ['wallet', 'email', 'google', 'twitter', 'discord'],

        // Embedded wallets configuration
        embeddedWallets: {
          // Ensure embedded Solana wallets are provisioned with signing capability
          solana: {
            createOnLogin: 'users-without-wallets',
            disableAutomaticMigration: false,
            showWalletUIs: true,
          },
          requireUserPasswordOnCreate: false, // Smooth UX - no extra password needed
        },

        // External wallet configuration - REQUIRED for Solana
        externalWallets: {
          solana: {
            // Use properly initialized Solana connectors
            connectors: solanaConnectors,
          },
        },

        // Legal and privacy
        legal: {
          termsAndConditionsUrl: 'https://payflix.com/terms',
          privacyPolicyUrl: 'https://payflix.com/privacy',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
