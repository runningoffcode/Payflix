// ============================================
// FLIX BACKEND - AUTHENTICATION SERVICE
// ============================================
// Handles user authentication with Supabase Auth

import { supabase } from '../lib/supabase';
import type { User, CreateUserInput, ApiResponse, UserRole } from '../types/supabase';

// ============================================
// SIGN UP
// ============================================

export async function signUp(
  email: string,
  password: string,
  userData: { username: string; role: UserRole; wallet_address?: string }
): Promise<ApiResponse<User>> {
  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { data: null, error: authError.message };
    }

    if (!authData.user) {
      return { data: null, error: 'Failed to create user account' };
    }

    // Step 2: Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        username: userData.username,
        role: userData.role,
        wallet_address: userData.wallet_address || null,
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: Delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { data: null, error: profileError.message };
    }

    return {
      data: profileData,
      error: null,
      message: 'Account created successfully! Please check your email to verify your account.',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'An unexpected error occurred' };
  }
}

// ============================================
// SIGN IN
// ============================================

export async function signIn(
  email: string,
  password: string
): Promise<ApiResponse<User>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { data: null, error: authError.message };
    }

    if (!authData.user) {
      return { data: null, error: 'Failed to sign in' };
    }

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      return { data: null, error: profileError.message };
    }

    return { data: profileData, error: null, message: 'Signed in successfully!' };
  } catch (error: any) {
    return { data: null, error: error.message || 'An unexpected error occurred' };
  }
}

// ============================================
// SIGN OUT
// ============================================

export async function signOut(): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null, message: 'Signed out successfully!' };
  } catch (error: any) {
    return { data: null, error: error.message || 'An unexpected error occurred' };
  }
}

// ============================================
// WALLET-BASED SIGN IN (For Web3 users)
// ============================================

export async function signInWithWallet(
  walletAddress: string,
  signature: string,
  message: string
): Promise<ApiResponse<User>> {
  try {
    // Verify signature (simplified - in production, verify on backend)
    // This is a placeholder for Web3 wallet authentication

    // Check if user exists with this wallet
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found
      return { data: null, error: fetchError.message };
    }

    if (existingUser) {
      // User exists - sign them in
      // Note: In production, you'd create a session here
      return { data: existingUser, error: null, message: 'Signed in with wallet!' };
    } else {
      // New wallet user - create account
      const username = `user_${walletAddress.slice(0, 8)}`;
      const email = `${walletAddress.toLowerCase()}@wallet.flix`;

      return await signUp(email, generateRandomPassword(), {
        username,
        role: 'viewer',
        wallet_address: walletAddress,
      });
    }
  } catch (error: any) {
    return { data: null, error: error.message || 'Wallet authentication failed' };
  }
}

// ============================================
// GET CURRENT USER
// ============================================

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      return { data: null, error: profileError.message };
    }

    return { data: profileData, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch user data' };
  }
}

// ============================================
// UPDATE USER PROFILE
// ============================================

export async function updateUserProfile(
  userId: string,
  updates: {
    username?: string;
    profile_image_url?: string;
    wallet_address?: string;
    bio?: string;
  }
): Promise<ApiResponse<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null, message: 'Profile updated successfully!' };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to update profile' };
  }
}

// ============================================
// CHANGE PASSWORD
// ============================================

export async function changePassword(newPassword: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null, message: 'Password changed successfully!' };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to change password' };
  }
}

// ============================================
// RESET PASSWORD
// ============================================

export async function resetPassword(email: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: null,
      error: null,
      message: 'Password reset email sent! Check your inbox.',
    };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to send reset email' };
  }
}

// ============================================
// CHECK USERNAME AVAILABILITY
// ============================================

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    // If error and code is PGRST116 (not found), username is available
    if (error && error.code === 'PGRST116') {
      return true;
    }

    // If data exists, username is taken
    return !data;
  } catch (error) {
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRandomPassword(): string {
  return Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
}
