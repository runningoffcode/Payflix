-- ============================================
-- SESSION KEYS TABLE FOR X402 SEAMLESS PAYMENTS
-- ============================================
-- Enables seamless payments without popup per video
-- Session keys allow facilitator to sign on behalf of users

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL,

  -- Session keypair (encrypted on server)
  session_public_key TEXT NOT NULL UNIQUE,
  session_private_key_encrypted TEXT NOT NULL, -- Encrypted with server secret

  -- Approval limits
  approved_amount DECIMAL(10, 6) NOT NULL, -- Max USDC user approved
  spent_amount DECIMAL(10, 6) DEFAULT 0.00, -- Amount spent so far
  remaining_amount DECIMAL(10, 6) NOT NULL, -- approved - spent

  -- Session metadata
  approval_signature TEXT NOT NULL, -- User's approval transaction signature
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 24 hours from creation
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT positive_amounts CHECK (approved_amount > 0 AND spent_amount >= 0),
  CONSTRAINT valid_remaining CHECK (remaining_amount >= 0)
);

-- Indexes for fast lookups
CREATE INDEX sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX sessions_user_wallet_idx ON public.sessions(user_wallet);
CREATE INDEX sessions_status_idx ON public.sessions(status);
CREATE INDEX sessions_expires_at_idx ON public.sessions(expires_at);
CREATE INDEX sessions_session_public_key_idx ON public.sessions(session_public_key);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (user_wallet = (SELECT wallet_address FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create own sessions" ON public.sessions
  FOR INSERT WITH CHECK (user_wallet = (SELECT wallet_address FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (user_wallet = (SELECT wallet_address FROM public.users WHERE id = auth.uid()));

-- Trigger: Update remaining_amount when spent_amount changes
CREATE OR REPLACE FUNCTION update_session_remaining_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_amount = NEW.approved_amount - NEW.spent_amount;
  NEW.last_used_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_remaining_on_spend
  BEFORE UPDATE OF spent_amount ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_remaining_amount();

-- Function: Get active session for user
CREATE OR REPLACE FUNCTION get_active_session(user_wallet_address TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  session_public_key TEXT,
  session_private_key_encrypted TEXT,
  approved_amount DECIMAL,
  spent_amount DECIMAL,
  remaining_amount DECIMAL,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.session_public_key,
    s.session_private_key_encrypted,
    s.approved_amount,
    s.spent_amount,
    s.remaining_amount,
    s.expires_at
  FROM public.sessions s
  WHERE s.user_wallet = user_wallet_address
    AND s.status = 'active'
    AND s.expires_at > NOW()
    AND s.remaining_amount > 0
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Expire old sessions (can be run as cron job)
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Sessions table created successfully!' AS status;
