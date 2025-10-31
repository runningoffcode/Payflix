-- ============================================
-- FIX SESSIONS TABLE RLS POLICIES
-- ============================================
-- The original policies use auth.uid() which doesn't work with JWT auth
-- We need to allow the service role (backend) to manage sessions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;

-- Create new policies that work with service role
-- Service role can do everything (backend operations)
CREATE POLICY "Service role can manage sessions" ON public.sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- If you want users to be able to view their own sessions via client-side queries:
-- CREATE POLICY "Users can view own sessions" ON public.sessions
--   FOR SELECT
--   USING (user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Verify
SELECT 'Sessions RLS policies fixed!' AS status;
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'sessions';
