// ============================================
// FLIX BACKEND - AUTH HOOK
// ============================================
// React hook for authentication state management

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types/supabase';
import * as authService from '../services/auth.service';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setUser(data);
    setLoading(false);
  }

  const signUp = async (
    email: string,
    password: string,
    userData: { username: string; role: 'creator' | 'viewer'; wallet_address?: string }
  ) => {
    setLoading(true);
    setError(null);
    const result = await authService.signUp(email, password, userData);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return result;
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const result = await authService.signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    const result = await authService.signOut();
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return result;
  };

  const updateProfile = async (updates: {
    username?: string;
    profile_image_url?: string;
    wallet_address?: string;
    bio?: string;
  }) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    setLoading(true);
    setError(null);
    const result = await authService.updateUserProfile(user.id, updates);
    if (result.data) {
      setUser(result.data);
    }
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    return result;
  };

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
    isCreator: user?.role === 'creator',
    isViewer: user?.role === 'viewer',
  };
}
