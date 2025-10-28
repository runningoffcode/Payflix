-- ============================================
-- FIX ROW LEVEL SECURITY FOR USER INSERTS
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create a more permissive INSERT policy that allows wallet-based registration
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (true);

-- This allows anyone to create a user profile via wallet connection
-- The wallet_address is the unique identifier for authentication
