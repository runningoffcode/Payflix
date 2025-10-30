import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface User {
  id: string;
  walletAddress: string;
  username: string;
  email: string;
  role: 'viewer' | 'creator';
  isCreator: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  becomeCreator: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, signMessage } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('flix_auth_token');
    const savedUser = localStorage.getItem('flix_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Auto-login when wallet connects
  useEffect(() => {
    if (connected && publicKey && !user) {
      login();
    }
  }, [connected, publicKey]);

  const login = async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const walletAddress = publicKey.toBase58();

      // Simplified login - no signature required (development mode)
      // In production, you'd verify wallet signatures
      const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          // Skip signature verification for seamless dev experience
        }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Login failed');
      }

      const { token: jwtToken, user: userData } = await loginResponse.json();

      // Save to state and localStorage
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('flix_auth_token', jwtToken);
      localStorage.setItem('flix_user', JSON.stringify(userData));

      console.log('✅ Logged in successfully:', userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('flix_auth_token');
    localStorage.removeItem('flix_user');
  };

  const becomeCreator = async () => {
    if (!publicKey || !user) {
      throw new Error('Must be logged in to become a creator');
    }

    setIsLoading(true);
    try {
      const walletAddress = publicKey.toBase58();

      const response = await fetch('http://localhost:5001/api/users/become-creator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to become creator');
      }

      const { user: updatedUser } = await response.json();

      // Update local state
      setUser(updatedUser);
      localStorage.setItem('flix_user', JSON.stringify(updatedUser));

      console.log('✅ You are now a creator!');
    } catch (error) {
      console.error('Become creator error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        becomeCreator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
