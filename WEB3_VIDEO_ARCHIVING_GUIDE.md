# Web3-Aligned Video Archiving System

## Philosophy

This system implements true web3 principles for video management:

1. **Videos with purchases are PERMANENT** - Once someone buys access, the content exists forever
2. **Creators can delete ONLY unpurchased videos** - Full control before any sales
3. **Archive feature for purchased videos** - Hide from public but maintain buyer access

This mirrors how blockchain tokens work - once minted and transferred, they're permanent.

---

## What's Been Implemented

### Backend Changes

#### 1. Updated DELETE Endpoint (videos.routes.ts)
- ✅ Checks if video has any purchases before allowing deletion
- ✅ If purchases exist, returns 403 error with message
- ✅ If no purchases, allows full deletion
- ✅ Deletes related records (payments, video_access) via cascade

#### 2. New ARCHIVE Endpoint (videos.routes.ts)
- ✅ `PATCH /api/videos/:id/archive`
- ✅ Sets `archived = true` on video
- ✅ Video hidden from public listings
- ✅ Buyers still have access (web3 permanence)

#### 3. Database Updates (supabase.ts)
- ✅ Updated `getAllVideos()` to filter `archived = false`
- ✅ Updated `deleteVideo()` to handle cascade deletions
- ✅ Archived videos excluded from public queries

---

## What You Need To Do

### Step 1: Add `archived` Field to Supabase

Go to Supabase SQL Editor and run this:

```sql
-- Add archived field to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_archived ON videos(archived);

-- Add comment
COMMENT ON COLUMN videos.archived IS 'If true, video is hidden from public listings but accessible to buyers (web3 permanence)';
```

### Step 2: Update RLS Policies (if you have them)

Make sure your RLS policies allow:
- SELECT on archived videos for buyers who purchased
- UPDATE archived field for creators
- DELETE only for videos with no purchases

### Step 3: Test the System

1. **Upload a test video**
2. **Try to delete it** - should work (no purchases)
3. **Have someone purchase the video**
4. **Try to delete it again** - should fail with message
5. **Archive the video instead** - should hide from public
6. **Buyer can still watch** - archived video accessible

---

## API Endpoints

### DELETE Video
```http
DELETE /api/videos/:id
Content-Type: application/json

{
  "creator_wallet": "your_wallet_address"
}
```

**Responses:**
- ✅ 200: Video deleted (no purchases existed)
- ⛔ 403: Cannot delete (has purchases) - use archive instead
- ❌ 404: Video not found

### ARCHIVE Video
```http
PATCH /api/videos/:id/archive
Content-Type: application/json

{
  "creator_wallet": "your_wallet_address"
}
```

**Responses:**
- ✅ 200: Video archived
- ❌ 403: Not authorized
- ❌ 404: Video not found

---

## UI Updates Needed

### VideoManagement Component

You need to update the UI to show:

1. **Delete button** - only if video has NO purchases
2. **Archive button** - if video HAS purchases
3. **Archived badge** - show on archived videos

Example logic:
```typescript
const handleDelete = async (video) => {
  try {
    const response = await fetch(`/api/videos/${video.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_wallet: creatorWallet }),
    });

    if (response.status === 403) {
      const data = await response.json();
      if (data.canArchive) {
        // Show archive option instead
        alert('This video has purchases. Use Archive instead of Delete.');
      }
    } else {
      // Video deleted successfully
      window.location.reload();
    }
  } catch (error) {
    console.error('Delete failed:', error);
  }
};

const handleArchive = async (video) => {
  try {
    const response = await fetch(`/api/videos/${video.id}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_wallet: creatorWallet }),
    });

    if (response.ok) {
      alert('Video archived! Hidden from public but buyers can still access.');
      window.location.reload();
    }
  } catch (error) {
    console.error('Archive failed:', error);
  }
};
```

---

## Testing Checklist

- [ ] SQL migration ran successfully in Supabase
- [ ] `archived` column exists on `videos` table
- [ ] Unpurchased videos can be deleted
- [ ] Purchased videos cannot be deleted
- [ ] Purchased videos can be archived
- [ ] Archived videos hidden from Home page
- [ ] Archived videos hidden from Browse page
- [ ] Buyers can still access archived videos they purchased
- [ ] Creator dashboard shows both delete/archive buttons correctly

---

## Web3 Principles Implemented

✅ **Permanence** - Purchased content cannot be removed
✅ **Transparency** - Clear error messages explain why
✅ **Buyer Protection** - Access remains forever
✅ **Creator Control** - Can hide content via archiving
✅ **Fair Economics** - Aligns with token/NFT model

This is how a true web3 video platform should work!
