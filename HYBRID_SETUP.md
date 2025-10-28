# 🚀 Flix Hybrid System - Arweave + Supabase

## Overview

Your Flix platform now uses a **hybrid architecture** combining the best of both worlds:

- **Arweave** - Permanent, decentralized video storage
- **Supabase** - Modern database, authentication, and analytics

---

## 🎯 Architecture

```
Frontend (React)
    ↓
Hybrid Services
    ├─→ Arweave Storage (via your backend API)
    │   └─→ Permanent video storage
    │       └─→ Immutable content
    │
    └─→ Supabase
        ├─→ PostgreSQL (video metadata, users, analytics)
        ├─→ Auth (email/password + wallet)
        └─→ Realtime (live stats updates)
```

---

## ✨ How It Works

### Video Upload Flow:

1. **User selects video file** in React frontend
2. **Video uploads to Arweave** (permanent storage)
   - Returns transaction ID and permanent URL
3. **Thumbnail uploads to Arweave** (or auto-generated)
4. **Metadata saves to Supabase**
   - Arweave URL stored in database
   - Transaction ID tracked
   - Creator stats updated automatically

### Video Playback Flow:

1. **User requests video** from Supabase database
2. **Database returns Arweave URL**
3. **Video streams directly from Arweave**
4. **View tracked in Supabase** (real-time analytics)

---

## 📁 New Files Created

### Services:
- ✅ `src/services/arweave-storage.service.ts` - Arweave integration
- ✅ `src/services/hybrid-video.service.ts` - Combined upload logic

### Hooks:
- ✅ `src/hooks/useHybridUpload.ts` - Upload hook with progress

---

## 🔧 Setup Instructions

### 1. Environment Variables

Update your `.env.local`:

```env
# Supabase (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Your backend API (Arweave server)
VITE_BACKEND_URL=http://localhost:5000/api

# Solana (already configured)
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 2. Ensure Your Backend is Running

Your existing backend (port 5000) handles Arweave uploads:

```bash
# In server directory
npm run dev
```

### 3. Set Up Supabase

Follow the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) guide to:
- Deploy database schema
- Create storage buckets (not used for videos, but for profile images)
- Configure environment

---

## 💻 Usage Examples

### Upload Video with Hybrid System

```typescript
import { useHybridUpload } from './hooks/useHybridUpload';

function UploadPage() {
  const {
    uploadVideo,
    estimateCost,
    uploading,
    progress,
    stage,
    error,
    video
  } = useHybridUpload();

  const handleUpload = async (videoFile: File) => {
    // Estimate Arweave cost first
    const cost = await estimateCost(videoFile);
    console.log(`Upload cost: ${cost.data?.ar} AR (~$${cost.data?.usd})`);

    // Upload video
    const result = await uploadVideo(
      videoFile,
      null, // thumbnail (null = auto-generate)
      {
        title: 'My Video',
        description: 'Description here',
        price: 4.99,
        category: 'Education',
        tags: ['tutorial', 'coding'],
      }
    );

    if (result.error) {
      console.error(result.error);
    } else {
      console.log('Uploaded!', result.data);
    }
  };

  return (
    <div>
      {uploading && (
        <div>
          <p>{stage}</p>
          <progress value={progress} max={100} />
        </div>
      )}

      <input
        type="file"
        accept="video/*"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleUpload(e.target.files[0]);
          }
        }}
      />
    </div>
  );
}
```

### Fetch Videos from Supabase (with Arweave URLs)

```typescript
import { useVideos } from './hooks/useVideos';

function HomePage() {
  const { videos, loading } = useVideos();

  return (
    <div>
      {videos.map(video => (
        <div key={video.id}>
          <h3>{video.title}</h3>
          {/* Video URL is from Arweave - permanent! */}
          <video src={video.video_url} controls />
          <p>Stored permanently on Arweave</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎨 Benefits of Hybrid System

### Arweave Storage:
✅ **Permanent** - Videos never deleted  
✅ **Decentralized** - No single point of failure  
✅ **Immutable** - Content can't be changed  
✅ **Web3 Native** - Perfect for crypto/NFT integration  
✅ **Pay once** - Store forever  

### Supabase Database:
✅ **Fast queries** - Instant search and filtering  
✅ **Real-time** - Live analytics updates  
✅ **Relational** - Complex queries supported  
✅ **Easy auth** - Built-in authentication  
✅ **Scalable** - Handles millions of records  

---

## 📊 Data Flow

### What's Stored Where:

**Arweave (Permanent Storage):**
- 🎥 Video files
- 🖼️ Thumbnails
- 📝 Immutable metadata (in transaction tags)

**Supabase (Database):**
- 👤 User profiles
- 📹 Video metadata (title, description, price, category)
- 🔗 Arweave URLs (links to permanent storage)
- 📊 Analytics (views, clicks, revenue)
- 💳 Transactions
- 🔐 User authentication

---

## 🔄 Update Flow

### Updating Video Metadata:

Videos on Arweave are **immutable** (can't be changed), but you can update database metadata:

```typescript
import { updateVideoMetadata } from './services/hybrid-video.service';

// Update price, category, etc. in Supabase
await updateVideoMetadata(videoId, {
  price: 9.99,
  category: 'Premium',
  is_promoted: true
});

// Note: Arweave content remains unchanged (permanent)
```

### Deleting Videos:

```typescript
import { deleteVideoFromDatabase } from './services/hybrid-video.service';

// Remove from database (still exists on Arweave permanently)
await deleteVideoFromDatabase(videoId);
```

**Important:** Arweave content is **permanent** - you can remove it from your database, but it will always exist on Arweave.

---

## 💰 Cost Considerations

### Arweave Costs:
- **One-time payment** for permanent storage
- ~$5-10 per GB (estimate)
- Payment in AR tokens
- Your backend wallet handles payments

### Supabase Costs:
- **Free tier**: 500MB database, 1GB file storage
- **Pro tier**: $25/month for more resources
- Database only (videos on Arweave)

**Total cost example:**
- 100GB of videos on Arweave: ~$500-1000 (one-time)
- Supabase database: Free to $25/month
- **Much cheaper than traditional cloud storage long-term!**

---

## 🚀 Migration from Old Storage

If you have videos in your old system:

```typescript
// Pseudo-code for migration
async function migrateToHybrid() {
  const oldVideos = await getOldVideos();

  for (const video of oldVideos) {
    // If video is already on Arweave, just add to Supabase
    await supabase.from('videos').insert({
      creator_id: video.creator_id,
      title: video.title,
      video_url: video.arweave_url, // Already on Arweave!
      thumbnail_url: video.thumbnail_url,
      duration: video.duration,
      price: video.price,
    });
  }
}
```

---

## 🔐 Security

### Arweave:
- ✅ Cryptographically signed transactions
- ✅ Immutable content
- ✅ Decentralized verification

### Supabase:
- ✅ Row Level Security (RLS)
- ✅ JWT authentication
- ✅ Encrypted connections

---

## 📈 Analytics & Monitoring

### Track Arweave Uploads:

```typescript
import { getArweaveTransactionStatus } from './services/arweave-storage.service';

const status = await getArweaveTransactionStatus(transactionId);
console.log(status.data);
// {
//   status: 'confirmed',
//   confirmed: true,
//   blockHeight: 1234567
// }
```

### Real-time Stats (Supabase):

```typescript
import { useCreatorStats } from './hooks/useCreatorStats';

function Dashboard() {
  const { stats } = useCreatorStats(creatorId);
  // Auto-updates in real-time!

  return <div>Views: {stats.total_views}</div>;
}
```

---

## 🎯 Best Practices

1. **Always upload to Arweave first** - Get permanent URL before saving to database

2. **Use transaction IDs** - Track Arweave transactions for verification

3. **Handle upload failures gracefully** - Arweave uploads can take time

4. **Cache Arweave URLs** - Store in Supabase for fast access

5. **Update only metadata in Supabase** - Arweave content is immutable

6. **Monitor Arweave wallet balance** - Ensure sufficient AR tokens

---

## 🐛 Troubleshooting

### Issue: "Backend URL not found"
**Solution:** Check `VITE_BACKEND_URL` in `.env.local` points to your Express server (port 5000)

### Issue: "Arweave wallet not configured"
**Solution:** Ensure your backend has Arweave wallet configured (check server/.env)

### Issue: "Upload to Arweave failed"
**Solution:** 
- Check Arweave wallet balance
- Verify backend server is running
- Check file size (keep under 500MB)

### Issue: "Video plays but stats don't update"
**Solution:** Ensure Supabase schema is deployed and RLS policies are configured

---

## 📚 Additional Resources

- **Arweave Docs:** https://docs.arweave.org
- **Supabase Docs:** https://supabase.com/docs
- **Your Backend:** Check `/server/services/arweave.service.ts`

---

## ✅ Summary

Your hybrid system gives you:

🎯 **Permanent video storage** on Arweave  
🎯 **Modern database** with Supabase  
🎯 **Real-time analytics** for creators  
🎯 **Web3 integration** with Solana wallets  
🎯 **Best of both worlds** - decentralized + scalable  

**You now have a production-ready, Web3-native video platform!** 🚀
