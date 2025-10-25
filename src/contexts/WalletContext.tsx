import React, { createContext, useContext, useState, useEffect } from 'react';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isCreator: boolean;
  becomeCreator: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    // Check if wallet was previously connected
    const savedWallet = localStorage.getItem('walletAddress');
    const savedIsCreator = localStorage.getItem('isCreator');

    if (savedWallet) {
      setWalletAddress(savedWallet);
      setIsCreator(savedIsCreator === 'true');
    }
  }, []);

  const connectWallet = async () => {
    try {
      // In a real implementation, this would connect to Phantom/Solflare wallet
      // For demo purposes, we'll generate a mock wallet
      const mockWallet = `${generateMockAddress()}`;

      // Call API to register wallet
      const response = await fetch('http://localhost:5000/api/users/connect-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: mockWallet,
          username: 'DemoUser',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect wallet');
      }

      const data = await response.json();

      setWalletAddress(mockWallet);
      setIsCreator(data.user.isCreator);

      // Save to localStorage
      localStorage.setItem('walletAddress', mockWallet);
      localStorage.setItem('isCreator', data.user.isCreator.toString());

      console.log('✅ Wallet connected:', mockWallet);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsCreator(false);
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('isCreator');
    console.log('👋 Wallet disconnected');
  };

  const becomeCreator = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/users/become-creator', {
        method: 'POST',
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to become creator');
      }

      setIsCreator(true);
      localStorage.setItem('isCreator', 'true');
      console.log('✅ Upgraded to creator account');
    } catch (error) {
      console.error('Failed to become creator:', error);
      alert('Failed to upgrade to creator. Please try again.');
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnected: !!walletAddress,
        connectWallet,
        disconnectWallet,
        isCreator,
        becomeCreator,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}

// Generate a mock Solana address for demo
function generateMockAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = '';
  for (let i = 0; i < 44; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}
