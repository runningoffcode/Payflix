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
