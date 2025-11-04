# Database Migration Guide: Secure Video Streaming Sessions

## Overview
This migration adds session-based security to prevent unauthorized URL sharing for video streaming.

## What This Fixes
**Problem**: Previously, anyone who obtained a signed R2 URL could share it with others, allowing unauthorized access for up to 1 hour.

**Solution**: Session-based streaming ties each URL to a specific wallet address. Even if someone shares the URL, it won't work for anyone except the wallet owner who paid for access.

## How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `lerndfwersgtxaowqbga`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the SQL below:

```sql
-- Migration: Create video_streaming_sessions table
-- Purpose: Track active video streaming sessions to prevent URL sharing
-- Date: 2025-11-01

CREATE TABLE IF NOT EXISTS video_streaming_sessions (
  id TEXT PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by session token
CREATE INDEX IF NOT EXISTS idx_video_streaming_sessions_token
  ON video_streaming_sessions(session_token);

-- Index for fast lookups by user wallet and video
CREATE INDEX IF NOT EXISTS idx_video_streaming_sessions_user_video
  ON video_streaming_sessions(user_wallet, video_id);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_video_streaming_sessions_expires
  ON video_streaming_sessions(expires_at);

-- Comments
COMMENT ON TABLE video_streaming_sessions IS 'Tracks active video streaming sessions with wallet binding to prevent URL sharing';
COMMENT ON COLUMN video_streaming_sessions.session_token IS 'Unique token that ties streaming URL to specific user';
COMMENT ON COLUMN video_streaming_sessions.user_wallet IS 'Wallet address of user who initiated the session';
COMMENT ON COLUMN video_streaming_sessions.expires_at IS 'When this session expires (typically 1 hour)';
```

6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned" - this means the table was created!

### Option 2: Using DATABASE_URL (Advanced)

If you have the database connection string:

1. Set the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.lerndfwersgtxaowqbga.supabase.co:5432/postgres"
   ```

2. Run the migration script:
   ```bash
   npx ts-node scripts/run-migration.ts
   ```

## Verify Migration

After running the migration, verify it worked:

```bash
npx ts-node scripts/apply-streaming-session-migration.ts
```

You should see: "✅ Table video_streaming_sessions already exists!"

## How the Security Works

### Before (Vulnerable):
```
User → /play-url → Signed R2 URL (shareable for 1 hour!)
```

### After (Secure):
```
User → /play-url → Creates session tied to wallet
     → Returns session token
     → /stream-secure?session=TOKEN validates wallet
     → Only works for the wallet that created the session
```

### Security Features:
- ✅ Session tokens are tied to wallet addresses
- ✅ Cannot share streaming URLs with others
- ✅ Session expires after 1 hour
- ✅ Session reuse for same user (no unnecessary database writes)
- ✅ Automatic cleanup of expired sessions

## Testing

Once the migration is applied, test the implementation:

1. Connect your wallet
2. Purchase a video
3. Try to play the video
4. Check browser console for session creation logs:
   ```
   🔗 Fetching secure streaming session...
   ✅ Got streaming session!
   🔒 Using session-based secure streaming
   ```

5. Try sharing the URL with another wallet - it should fail with:
   ```
   ❌ Invalid or expired session
   ```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
DROP TABLE IF EXISTS video_streaming_sessions CASCADE;
```

## Questions?

If you encounter any issues, check:
- Table exists: `SELECT * FROM video_streaming_sessions LIMIT 1;`
- Foreign key works: Video IDs must exist in `videos` table
- Indexes created: `\d video_streaming_sessions` in psql

---

**Migration Status**: ⏳ Pending - Please run the SQL above in Supabase Dashboard
