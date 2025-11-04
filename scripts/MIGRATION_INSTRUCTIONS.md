# Database Migration Instructions

## Problem
Your Supabase database schema uses UUID types for user IDs, but the application is creating TEXT-format user IDs like `"user_1761901622618_pyt92"`. This causes video upload failures with the error:
```
invalid input syntax for type uuid: "user_1761901622618_pyt92"
```

## Solution
Run the comprehensive SQL migration script that converts all user ID columns from UUID to TEXT.

## Steps to Fix

### 1. Open Supabase SQL Editor
- Go to your Supabase project: https://lerndfwersgtxaowqbga.supabase.co
- Navigate to the SQL Editor

### 2. Run the Migration Script
- Open the file: `scripts/fix-creator-id-type.sql`
- Copy the entire contents
- Paste into Supabase SQL Editor
- Click "Run" or press Cmd+Enter

### 3. Verify the Migration
The script automatically runs a verification query at the end that shows all updated column types. You should see:
- `users.id` → TEXT
- `videos.creator_id` → TEXT
- `creator_stats.creator_id` → TEXT
- `video_access.user_id` → TEXT
- `payments.user_id` → TEXT
- `sessions.user_id` → TEXT
- `transactions.user_id` → TEXT
- `transactions.creator_id` → TEXT
- `video_unlocks.user_id` → TEXT
- `video_views.user_id` → TEXT

### 4. Test Video Upload
After the migration completes successfully:
1. Go to http://localhost:3000
2. Log in with your wallet
3. Try uploading a video
4. The upload should now work without UUID errors

## What the Migration Does

### Step 1: Drop Foreign Key Constraints
Temporarily removes all foreign key constraints that reference `users.id` from 9 different tables.

### Step 2: Convert users.id
Changes the `users.id` column from UUID to TEXT type.

### Step 3: Convert Foreign Key Columns
Updates all columns that reference `users.id` to TEXT type (10 columns across 8 tables).

### Step 4: Restore Foreign Key Constraints
Re-adds all foreign key constraints with the correct TEXT type.

### Step 5: Verification
Displays a table showing all updated column types for manual verification.

## Tables Updated
- ✅ users
- ✅ videos
- ✅ creator_stats
- ✅ video_access
- ✅ payments
- ✅ sessions
- ✅ transactions
- ✅ video_unlocks
- ✅ video_views

## Rollback (if needed)
If you need to rollback this migration, you would need to:
1. Delete all existing user records with TEXT IDs
2. Run the reverse migration (UUID schema)
3. Recreate users with Supabase's UUID generation

However, this is NOT recommended as you'll lose all existing user data.

## After Migration
Once the migration is successful, your video uploads will work properly. The system will continue creating TEXT-format user IDs, which will now be fully compatible with your database schema.
