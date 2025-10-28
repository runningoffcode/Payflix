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
