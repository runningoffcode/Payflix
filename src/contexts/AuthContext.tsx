import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clearAllAppState } from '../utils/clearAppState';

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
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const previousWalletRef = useRef<string | null>(null);
  const loginInProgressRef = useRef(false);

  // Get wallet address from connected wallet
  const currentWallet = publicKey?.toBase58() || null;

  // Load token from localStorage on mount and validate it
  useEffect(() => {
    const validateSavedAuth = async () => {
      setIsValidatingToken(true);
      const savedToken = localStorage.getItem('flix_auth_token');
      const savedUser = localStorage.getItem('flix_user');

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);

          // CRITICAL: Validate that the saved user matches the currently connected wallet
          if (currentWallet && parsedUser.walletAddress !== currentWallet) {
            console.log('⚠️ Wallet mismatch detected on mount!');
            console.log(`   Saved user wallet: ${parsedUser.walletAddress.slice(0, 8)}...`);
            console.log(`   Connected wallet: ${currentWallet.slice(0, 8)}...`);
            console.log('   Clearing stale auth state...');
            localStorage.removeItem('flix_auth_token');
            localStorage.removeItem('flix_user');
            setIsValidatingToken(false);
            return;
          }

          // Validate token by checking /api/auth/me
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${savedToken}`,
            },
          });

          if (response.ok) {
            // Token is valid
            setToken(savedToken);
            setUser(parsedUser);
            console.log('✅ Restored valid auth session');
          } else {
            // Token is invalid - clear everything
            console.log('⚠️ Invalid token detected - clearing auth state');
            localStorage.removeItem('flix_auth_token');
            localStorage.removeItem('flix_user');
          }
        } catch (error) {
          // Network error or token validation failed
          console.log('⚠️ Token validation failed - clearing auth state');
          localStorage.removeItem('flix_auth_token');
          localStorage.removeItem('flix_user');
        }
      }

      setIsValidatingToken(false);
    };

    if (!connecting) {
      validateSavedAuth();
    }
  }, [currentWallet, connecting]);

  // Detect wallet changes and reset everything
  useEffect(() => {
    const previousWallet = previousWalletRef.current;

    // IMPORTANT: Only update ref if this is the first mount or wallet actually changed
    // Don't trigger change detection on every render
    if (previousWallet === currentWallet) {
      return; // No change, skip
    }

    // If this is initial mount (previousWallet is null), just set the ref
    if (!previousWallet && currentWallet) {
      console.log('🔵 Initial wallet detected:', currentWallet.slice(0, 8) + '...');
      previousWalletRef.current = currentWallet;
      return;
    }

    // If wallet changed (not just disconnected)
    if (previousWallet && currentWallet && previousWallet !== currentWallet) {
      console.log('🔄 Wallet changed detected, resetting everything...');
      console.log(`   From: ${previousWallet.slice(0, 8)}...`);
      console.log(`   To: ${currentWallet.slice(0, 8)}...`);

      // Clear ALL app state (localStorage, sessionStorage, etc.)
      clearAllAppState();

      // Clear React state
      setUser(null);
      setToken(null);

      // Clear login in progress flag
      loginInProgressRef.current = false;

      // Navigate to home page (replace history so user can't go back to previous wallet's page)
      if (location.pathname !== '/') {
        console.log('   Navigating to home page...');
        navigate('/', { replace: true });
      }

      // Trigger login for new wallet after a short delay to ensure state is cleared
      setTimeout(() => {
        console.log('   🔑 Logging in with new wallet...');
        login();
      }, 150);

      // Update the reference
      previousWalletRef.current = currentWallet;
    }

    // If wallet disconnected
    if (previousWallet && !currentWallet) {
      console.log('🔌 Wallet disconnected');
      previousWalletRef.current = null;
    }
  }, [currentWallet]);

  // Auto-login when wallet connects (first time)
  useEffect(() => {
    console.log('🔍 Auto-login check:', { connected, connecting, currentWallet, hasUser: !!user, isLoading, isValidatingToken, loginInProgress: loginInProgressRef.current });

    // Don't auto-login while wallet is connecting
    if (connecting) {
      console.log('⏳ Wallet connecting...');
      return;
    }

    // Don't auto-login while we're still validating a saved token
    if (isValidatingToken) {
      console.log('⏳ Waiting for token validation to complete...');
      return;
    }

    // Don't trigger multiple simultaneous login attempts (React Strict Mode protection)
    if (loginInProgressRef.current) {
      console.log('⏳ Login already in progress, skipping duplicate attempt...');
      return;
    }

    if (connected && currentWallet && !user && !isLoading) {
      console.log('✅ Conditions met - triggering auto-login');
      loginInProgressRef.current = true;
      login()
        .catch(err => {
          console.error('❌ Auto-login failed:', err);
          // Don't throw - just log the error
        })
        .finally(() => {
          loginInProgressRef.current = false;
        });
    } else if (connected && currentWallet && user) {
      console.log('ℹ️ Already logged in:', user);
    } else if (!connected) {
      console.log('⚠️ Wallet not connected');
    } else if (!currentWallet) {
      console.log('⚠️ No wallet address available');
    } else if (isLoading) {
      console.log('⏳ Login in progress...');
    }
  }, [connected, connecting, currentWallet, user, isLoading, isValidatingToken]);

  const login = async (retryCount = 0) => {
    if (!currentWallet) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const walletAddress = currentWallet;
      console.log(`🔐 Attempting login for wallet: ${walletAddress.slice(0, 8)}... (attempt ${retryCount + 1})`);

      // Simplified login - no signature required (development mode)
      // In production, you'd verify wallet signatures
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          // Skip signature verification for seamless dev experience
        }),
      });

      console.log(`📡 Login response status: ${loginResponse.status}`);

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({}));
        console.error('❌ Login failed:', errorData);
        throw new Error(errorData.error || 'Login failed');
      }

      const responseData = await loginResponse.json();
      console.log('📦 Login response data:', responseData);

      const { token: jwtToken, user: userData } = responseData;

      if (!jwtToken || !userData) {
        throw new Error('Invalid login response - missing token or user data');
      }

      // Save to state and localStorage
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('flix_auth_token', jwtToken);
      localStorage.setItem('flix_user', JSON.stringify(userData));

      console.log('✅ Logged in successfully:', userData);
      console.log('   - User ID:', userData.id);
      console.log('   - Is Creator:', userData.isCreator);
      console.log('   - Username:', userData.username);
    } catch (error: any) {
      console.error('❌ Login error:', error);

      // Retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 500; // 500ms, 1000ms
        console.log(`⏳ Retrying login in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return login(retryCount + 1);
      }

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
    // Disconnect wallet
    disconnect();
  };

  const becomeCreator = async () => {
    if (!currentWallet || !user) {
      throw new Error('Must be logged in to become a creator');
    }

    setIsLoading(true);
    try {
      const walletAddress = currentWallet;

      console.log('🚀 Sending become creator request for wallet:', walletAddress);

      const response = await fetch('/api/users/become-creator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
      });

      console.log('📡 Become creator response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Become creator error data:', errorData);
        throw new Error(errorData.error || 'Failed to become creator');
      }

      const { user: updatedUser } = await response.json();

      console.log('✅ Received updated user:', updatedUser);

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
