# Supabase & RLS Playbook

This playbook unifies all Supabase setup, RLS remediation, storage policy guidance, and SQL fix scripts. It replaces the scattered references from `SUPABASE_SETUP.md`, `SUPABASE_SETUP_GUIDE.md`, and `RLS_FIX_INSTRUCTIONS.md` (full originals live in the appendices below).

## Quick Checklist
1. **Provision Supabase project** → grab URL + anon/service keys, populate `.env`.
2. **Apply schema** → run `CREATE_TABLES.sql` (or `supabase/schema.sql`) to create `users`, `videos`, `payments`, `video_access`, etc.
3. **RLS posture** → dev mode usually disables RLS via `COMPLETE_RLS_FIX.sql`; production reinstates policies per table.
4. **Storage** → create `videos`, `thumbnails`, `profile-images` buckets, mark as public, apply permissive policies for dev.
5. **Verification** → run the SQL snippets in this doc to confirm tables exist, RLS state is expected, and buckets are public.

## Architecture Snapshot
```
Client (.env)        Backend (Express)                   Supabase
-------------        ------------------                 ---------
VITE_SUPABASE_URL -> supabase client (anon/service) -> Auth, storage, tables
VITE_SUPABASE_ANON_KEY  ↑                               ↑
VITE_SUPABASE_SERVICE_KEY (optional) -> privileged ops (migrations, scripts)
```

## SQL Fix Script Map
| Script | Purpose | Usage Notes |
| --- | --- | --- |
| `CREATE_TABLES.sql` | Creates core PayFlix tables | Run first in new project (also mirrored in `supabase/schema.sql`). |
| `COMPLETE_RLS_FIX.sql` *(legacy folder)* | Disables RLS + grants perms | Use for dev/unblocked testing; referenced in appendices. |
| `FIX_CREATOR_WALLETS.sql` *(legacy folder)* | Re-sync video creator wallets with users table | Run only for historical data repair; superseded by scripts `reassign-video-creator.ts`. |
| `FIX_SESSIONS_RLS.sql` *(legacy folder)* | Updates sessions table policies for service role | Keep until formal migrations capture session RLS. |
| `FIX_VIDEOS_RLS.sql` *(legacy folder)* | Opens read policies on videos table | Still used by `scripts/fix-rls.ts`; keep until script is refactored. |
| `SETUP_PROFILE_STORAGE.sql` | Creates storage bucket/policies | Used by profile/avatar workflow (now referenced in `docs/infra/wallets.md`). |

## Verification Snippets
```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users','videos','payments','video_access');

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users','videos','payments','video_access');

-- Check buckets
SELECT id, name, public FROM storage.buckets
WHERE id IN ('videos','thumbnails','profile-images');
```

## Troubleshooting Guide
| Issue | Cause | Fix |
| --- | --- | --- |
| “relation ... does not exist” | Schema not applied | Run `CREATE_TABLES.sql` / migrations. |
| “new row violates row-level security policy” | RLS enabled | Run `COMPLETE_RLS_FIX.sql` (dev) or ensure JWT claims/policies configured. |
| Storage 403s | Buckets not public / policies missing | Re-run bucket policy steps in Appendix A/B. |
| Need quick bypass | Service role for dev only | Add `VITE_SUPABASE_SERVICE_KEY` & guard usage; never expose publicly. |

## Appendices
- **Appendix A** — `SUPABASE_SETUP.md` (complete walkthrough)
- **Appendix B** — `SUPABASE_SETUP_GUIDE.md`
- **Appendix C** — `RLS_FIX_INSTRUCTIONS.md`

---

### Appendix A — SUPABASE_SETUP.md (verbatim)
# COMPLETE SUPABASE SETUP FOR PAYFLIX

## ERROR: "relation 'public.payments' does not exist"

This error means your Supabase database tables haven't been created yet. Follow these steps IN ORDER:

---

## STEP 1: CREATE DATABASE TABLES

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `lerndfwersgtxaowqbga`
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open the file: `CREATE_TABLES.sql`
6. Copy **ALL** the contents
7. Paste into Supabase SQL Editor
8. Click **Run** (bottom right)

**Expected Output:**
```
table_name    | column_count
--------------+-------------
payments      | 11
users         | 7
video_access  | 5
videos        | 15

status: "Database schema created successfully!"
```

---

## STEP 2: DISABLE RLS (Row Level Security)

1. Stay in **SQL Editor**
2. Click **New Query**
3. Open the file: `COMPLETE_RLS_FIX.sql`
4. Copy **ALL** the contents
5. Paste into Supabase SQL Editor
6. Click **Run**

**Expected Output:**
```
tablename     | rls_enabled
--------------+------------
payments      | f
users         | f
video_access  | f
videos        | f

status: "RLS has been completely disabled. All tables are now accessible."
```

---

## STEP 3: CREATE STORAGE BUCKETS

### Option A: Using SQL (Recommended)

1. Stay in **SQL Editor**
2. Click **New Query**
3. Paste this code:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('videos', 'videos', true),
  ('thumbnails', 'thumbnails', true),
  ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Verify buckets created
SELECT id, name, public FROM storage.buckets;
```

4. Click **Run**

### Option B: Using Dashboard

1. Click **Storage** (left sidebar)
2. Click **New bucket**
3. Create these 3 buckets (make each one public):
   - `videos` ✓ Public
   - `thumbnails` ✓ Public
   - `profile-images` ✓ Public

---

## STEP 4: CONFIGURE STORAGE POLICIES

1. Go to **Storage** → Click each bucket
2. Click **Policies** tab
3. Click **New Policy** → **For full customization** → **Get started**
4. Create this policy for EACH bucket:

**Policy Name:** `Public Access`

**Allowed Operations:** Check ALL boxes
- SELECT
- INSERT
- UPDATE
- DELETE

**Target roles:** 
- `public`
- `anon`
- `authenticated`

**USING expression:**
```sql
true
```

**WITH CHECK expression:**
```sql
true
```

5. Click **Review** → **Save policy**
6. Repeat for all 3 buckets

---

## STEP 5: VERIFY SETUP

Run this in SQL Editor to verify everything:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'videos', 'payments', 'video_access');

-- Check RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check buckets exist and are public
SELECT id, name, public 
FROM storage.buckets;
```

**Expected:**
- 4 tables exist
- All tables have `rowsecurity = f` (false)
- 3 buckets exist and are public

---

## STEP 6: TEST UPLOAD

1. Go to http://localhost:3002
2. Connect your Phantom/Solflare wallet
3. Go to **Creator Studio**
4. Click **Upload Video** tab
5. Fill in:
   - Video file (any video)
   - Title
   - Price (e.g., 4.99)
6. Click **Upload to Arweave**

**If successful:**
- Progress bar shows: "Checking user profile..." → "Uploading video..." → "Upload complete!"
- Video appears in your analytics

**If still failing:**
- Open browser console (F12 → Console)
- Copy the error message
- Check which step is failing

---

## TROUBLESHOOTING

### Error: "relation does not exist"
→ Run STEP 1 again (CREATE_TABLES.sql)

### Error: "new row violates row-level security policy"
→ Run STEP 2 again (COMPLETE_RLS_FIX.sql)

### Error: "storage bucket does not exist"
→ Complete STEP 3 (create buckets)

### Error: "permission denied for storage"
→ Complete STEP 4 (storage policies)

### Error: "Failed to upload video"
→ Check browser console for specific error
→ Verify all previous steps completed successfully

---

## QUICK CHECKLIST

- [ ] Ran CREATE_TABLES.sql (STEP 1)
- [ ] Verified 4 tables created
- [ ] Ran COMPLETE_RLS_FIX.sql (STEP 2)
- [ ] Verified RLS disabled on all tables
- [ ] Created 3 storage buckets (STEP 3)
- [ ] Made all buckets public
- [ ] Created storage policies (STEP 4)
- [ ] Tested video upload (STEP 6)
- [ ] Upload successful ✓

---

## Files Reference

- `CREATE_TABLES.sql` - Creates all database tables
- `COMPLETE_RLS_FIX.sql` - Disables RLS and grants permissions
- `SUPABASE_SETUP.md` - This file (complete instructions)

**Run them in this order:**
1. CREATE_TABLES.sql
2. COMPLETE_RLS_FIX.sql
3. Configure storage buckets

---

**Need help?** Check the Supabase docs:
- Tables: https://supabase.com/docs/guides/database/tables
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- Storage: https://supabase.com/docs/guides/storage

### Appendix B — SUPABASE_SETUP_GUIDE.md (verbatim)

# Supabase Setup Guide for PayFlix

This guide will walk you through setting up Supabase for your PayFlix platform.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email

## Step 2: Create a New Project

1. Click "New Project"
2. Fill in:
   - **Project Name**: `payflix` (or your choice)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
3. Click "Create new project"
4. Wait 2-3 minutes for project provisioning

## Step 3: Get Your Credentials

1. Once your project is ready, go to **Settings** (gear icon)
2. Click **API** in the left sidebar
3. Copy these two values:
   - **Project URL** (starts with `https://...supabase.co`)
   - **anon public** key (long string)

## Step 4: Add Credentials to PayFlix

1. Open your `.env` file in the PayFlix root directory
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

3. Save the file
4. Restart your dev server:
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Step 5: Create Database Tables

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste this SQL:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  bio TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  price_usdc DECIMAL(10, 2) NOT NULL,
  arweave_tx_id TEXT,
  arweave_url TEXT,
  thumbnail_url TEXT,
  category TEXT,
  tags TEXT[],
  duration INTEGER,
  views INTEGER DEFAULT 0,
  is_promoted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  buyer_wallet TEXT NOT NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_usdc DECIMAL(10, 2) NOT NULL,
  transaction_signature TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_wallet TEXT NOT NULL,
  subscriber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, creator_id)
);

-- Create indexes for better performance
CREATE INDEX idx_videos_creator ON videos(creator_wallet);
CREATE INDEX idx_videos_price ON videos(price_usdc);
CREATE INDEX idx_videos_created ON videos(created_at DESC);
CREATE INDEX idx_purchases_video ON purchases(video_id);
CREATE INDEX idx_purchases_buyer ON purchases(buyer_wallet);
CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_wallet);
CREATE INDEX idx_subscriptions_creator ON subscriptions(creator_wallet);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (anyone can read, only owner can update)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (wallet_address = current_setting('request.jwt.claim.wallet', true));

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claim.wallet', true));

-- RLS Policies for videos (anyone can read, only creator can modify)
CREATE POLICY "Videos are viewable by everyone" ON videos
  FOR SELECT USING (true);

CREATE POLICY "Creators can insert own videos" ON videos
  FOR INSERT WITH CHECK (creator_wallet = current_setting('request.jwt.claim.wallet', true));

CREATE POLICY "Creators can update own videos" ON videos
  FOR UPDATE USING (creator_wallet = current_setting('request.jwt.claim.wallet', true));

CREATE POLICY "Creators can delete own videos" ON videos
  FOR DELETE USING (creator_wallet = current_setting('request.jwt.claim.wallet', true));

-- RLS Policies for purchases (anyone can insert, users can view own purchases)
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (buyer_wallet = current_setting('request.jwt.claim.wallet', true));

CREATE POLICY "Users can insert purchases" ON purchases
  FOR INSERT WITH CHECK (true);

-- RLS Policies for subscriptions
CREATE POLICY "Subscriptions are viewable by everyone" ON subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL USING (subscriber_wallet = current_setting('request.jwt.claim.wallet', true));
```

4. Click **Run** to execute the SQL
5. You should see "Success. No rows returned"

## Step 6: Create Storage Buckets

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Create these buckets (one at a time):
   - Name: `videos`, Public: **Yes**
   - Name: `thumbnails`, Public: **Yes**
   - Name: `profile-images`, Public: **Yes**

## Step 7: Test the Connection

1. Your dev server should now connect to Supabase
2. Try uploading a video in Creator Studio
3. Check your Supabase project's **Table Editor** to see the data

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env` file has the correct values
- Restart the dev server after updating `.env`

### "Failed to fetch"
- Check your internet connection
- Verify your Supabase project URL is correct
- Make sure your Supabase project is not paused (free tier pauses after inactivity)

### "Row Level Security" errors
- Make sure you ran all the RLS policies in Step 5
- For testing, you can temporarily disable RLS in Table Editor settings

## What's Next?

Once Supabase is connected:
- Video uploads will be saved to your database
- Creator analytics will show real data
- Purchase history will be tracked
- User profiles will persist

Need help? Check the [Supabase documentation](https://supabase.com/docs)

### Appendix C — RLS_FIX_INSTRUCTIONS.md (verbatim)

# COMPLETE FIX FOR "new row violates row-level security policy" ERROR

## Problem
You're getting RLS (Row Level Security) errors when uploading videos through the CreatorStudio because Supabase is blocking inserts into the `users` and `videos` tables.

## Solution: 3 Steps

### STEP 1: Run SQL Script in Supabase

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `lerndfwersgtxaowqbga`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the **ENTIRE contents** of `COMPLETE_RLS_FIX.sql`
6. Click **Run** (bottom right)

You should see output showing:
- `rls_enabled` = `false` for all tables
- Success message: "RLS has been completely disabled"

### STEP 2: Make Storage Buckets Public

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. For EACH bucket (`videos`, `thumbnails`, `profile-images`):
   - Click the bucket name
   - Click the **Policies** tab (top right)
   - Click **New Policy**
   - Click **For full customization** (bottom)
   - Click **Get started quickly** 
   - Select **Enable insert access for all users** (check ALL boxes)
   - Click **Save policy**
   - Repeat for SELECT, UPDATE, DELETE (or just select all operations)

OR simpler method:
   - Click the 3 dots next to bucket name
   - Select **Make Public**
   - Confirm

### STEP 3: Verify It Works

1. Go to http://localhost:3002
2. Connect your Phantom/Solflare wallet
3. Navigate to **Creator Studio**
4. Click **Upload Video** tab
5. Try uploading a test video

If it still fails, check the browser console (F12) for the exact error message.

## Quick Verification Commands

Run these in Supabase SQL Editor to verify RLS is off:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'videos', 'payments', 'video_access');

-- Should show rowsecurity = false for all

-- Check grants
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND grantee IN ('anon', 'authenticated');

-- Should show ALL privileges granted
```

## Alternative: Use Service Role Key (NOT RECOMMENDED for production)

If the above doesn't work, you can use the service role key which bypasses RLS:

1. In Supabase Dashboard → Settings → API
2. Copy the `service_role` key (⚠️ KEEP THIS SECRET)
3. In your `.env` file, add:
   ```
   VITE_SUPABASE_SERVICE_KEY=your_service_role_key_here
   ```
4. Update `src/lib/supabase.ts` to use service key for uploads

⚠️ **WARNING**: Service role bypasses ALL security. Only use for development.

## Still Having Issues?

If you're still getting RLS errors after following all steps:

1. Check browser console for exact error
2. Verify you're using the correct Supabase project
3. Try creating a NEW bucket and making it public
4. Check if there are any triggers on the tables

---

**Questions? Check:**
- Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security
- Storage policies: https://supabase.com/docs/guides/storage/security/access-control
