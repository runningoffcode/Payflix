# Video Archive Feature

## Overview
The archive feature allows creators to hide videos from public view while keeping them accessible to users who already purchased them. This solves the problem where videos with purchases cannot be deleted.

## What Archive Does

### For Creators:
- **Archive** a video to hide it from:
  - Home page
  - Category listings
  - Public video browsing
- Videos can be **unarchived** at any time to make them public again
- Archived videos still show in the creator's dashboard with an "ARCHIVED" badge
- Creators can still view, edit, and manage archived videos

### For Purchasers:
- **Users who bought the video can still access it** in their "Purchased Videos" section
- Direct link access still works (e.g., `/video/video_12345`)
- All features work normally (viewing, downloading if allowed, etc.)

### For Public:
- Archived videos are **completely hidden** from:
  - Home page video listings
  - Category/browse pages
  - Search results
  - Creator's public profile

## How to Use

### Archive a Video:
1. Go to **Creator Dashboard** → **Videos** tab
2. Find the video you want to archive
3. Click the **📦 Archive** button
4. Video is immediately hidden from public view
5. An "ARCHIVED" badge appears on the video in your dashboard

### Unarchive a Video:
1. Go to **Creator Dashboard** → **Videos** tab
2. Find the archived video (shows "ARCHIVED" badge)
3. Click the **📂 Unarchive** button
4. Video becomes public again immediately

## When to Use Archive

### Use Archive When:
- You want to temporarily hide a video
- A video has purchases but you don't want new viewers to find it
- You're updating/replacing content but want to keep access for existing buyers
- You want to remove a video from public catalog but honor past purchases

### Use Delete When:
- Video has **zero purchases**
- You want to permanently remove the video
- No users have paid for access

## Technical Details

### Database Changes:
- Added `archived` boolean column to `videos` table (default: `false`)
- Updated queries to filter `archived = false` in public listings
- Video access/streaming still works for archived videos via direct ID

### API Endpoints:
- `PATCH /api/videos/:id/archive` - Toggle archive status
  - Body: `{ archived: boolean, creator_wallet: string }`
  - Returns: Updated video object

### Frontend Changes:
- Archive button in [VideoManagement.tsx](src/components/creator/VideoManagement.tsx)
- "ARCHIVED" badge on archived videos in dashboard
- No changes needed for purchased videos access (works automatically)

## Benefits

1. **Honors Web3 Principles**: Can't delete content users paid for
2. **Flexible Content Management**: Hide/show videos without losing purchase history
3. **Better UX**: Users who purchased still have access
4. **Creator Control**: Remove unwanted videos from public view

## Migration

Run the migration to add the `archived` column:
```bash
npx ts-node scripts/migrate-add-archived.ts
```

Or manually run this SQL in Supabase:
```sql
ALTER TABLE videos ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_videos_archived ON videos(archived);
```

## Files Modified

**Backend:**
- [server/types/index.ts](server/types/index.ts) - Added `archived` field to Video interface
- [server/database/supabase.ts](server/database/supabase.ts) - Updated create/update/query methods
- [server/database/index.ts](server/database/index.ts) - Updated in-memory database
- [server/routes/videos.routes.ts](server/routes/videos.routes.ts) - Added archive endpoint

**Frontend:**
- [src/components/creator/VideoManagement.tsx](src/components/creator/VideoManagement.tsx) - Added archive UI

**Scripts:**
- [scripts/add-archived-column.sql](scripts/add-archived-column.sql) - SQL migration
- [scripts/migrate-add-archived.ts](scripts/migrate-add-archived.ts) - TypeScript migration runner

---

**Created**: 2025-01-XX
**Feature**: Video Archive/Unarchive
**Status**: ✅ Complete and Ready for Testing
