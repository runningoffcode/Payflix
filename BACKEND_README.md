# 🎬 Flix - Complete Supabase Backend

> Production-ready backend for YouTube-style creator platform with instant monetization.

## 🚀 Features

✅ **Complete Authentication System**
- Email/password signup and login
- Wallet-based authentication (Solana)
- User roles (Creator/Viewer)
- Profile management

✅ **Video Management**
- Upload videos with metadata
- Trending algorithm (promoted videos)
- Top videos by views
- Search and filtering
- Category organization
- Real-time view tracking

✅ **Analytics & Tracking**
- Creator dashboard with stats
- Revenue tracking
- Views and clicks analytics
- 30-day trends
- Per-video analytics
- Real-time updates via Supabase Realtime

✅ **Payment System**
- Mock payment integration (ready for Stripe/Solana)
- Video unlock/purchase
- Transaction history
- Earnings summary
- Refund support

✅ **File Storage**
- Video uploads (up to 500MB)
- Thumbnail uploads
- Profile images
- Auto-generated thumbnails from video
- File validation and sanitization

✅ **Security**
- Row Level Security (RLS) policies
- JWT-based authentication
- Secure file uploads
- Input validation
- SQL injection protection

---

## 📁 Project Structure

```
Payflix/
├── supabase/
│   └── schema.sql                    # Complete database schema
├── src/
│   ├── lib/
│   │   └── supabase.ts              # Supabase client configuration
│   ├── types/
│   │   └── supabase.ts              # TypeScript types for all entities
│   ├── services/
│   │   ├── auth.service.ts          # Authentication operations
│   │   ├── video.service.ts         # Video CRUD operations
│   │   ├── analytics.service.ts     # Analytics and stats
│   │   ├── payment.service.ts       # Payments and transactions
│   │   └── storage.service.ts       # File uploads
│   └── hooks/
│       ├── useAuth.ts               # Auth state management
│       ├── useVideos.ts             # Video data fetching
│       ├── useCreatorStats.ts       # Creator analytics
│       └── usePayment.ts            # Payment operations
├── .env.example                      # Environment template
├── SUPABASE_SETUP.md                # Setup guide
├── API_REFERENCE.md                 # Complete API docs
└── BACKEND_README.md                # This file
```

---

## ⚡ Quick Start

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Set Up Supabase Project

Follow the detailed guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

Quick steps:
1. Create project at https://app.supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Create storage buckets (videos, thumbnails, profile-images)
4. Copy API keys to `.env.local`

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Test Connection

```typescript
import { supabase } from './src/lib/supabase';

const { data, error } = await supabase.from('users').select('count');
console.log('Connected:', !error);
```

---

## 🎯 Usage Examples

### Authentication

```typescript
import { useAuth } from './hooks/useAuth';

function MyApp() {
  const { user, signIn, signUp, signOut, loading } = useAuth();

  const handleSignUp = async () => {
    const result = await signUp('user@example.com', 'password123', {
      username: 'johndoe',
      role: 'creator'
    });
    
    if (result.error) {
      alert(result.error);
    }
  };

  return (
    <div>
      {user ? (
        <div>
          Welcome {user.username}!
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={handleSignUp}>Sign Up</button>
      )}
    </div>
  );
}
```

### Fetch Videos

```typescript
import { useVideos } from './hooks/useVideos';

function VideoList() {
  const { videos, loading, error } = useVideos(
    { category: 'Technology' },
    { page: 1, limit: 20, sort_by: 'views', order: 'desc' }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {videos.map(video => (
        <div key={video.id}>
          <h3>{video.title}</h3>
          <p>By {video.creator.username}</p>
          <p>{video.views} views</p>
        </div>
      ))}
    </div>
  );
}
```

### Creator Dashboard

```typescript
import { useCreatorStats } from './hooks/useCreatorStats';

function CreatorDashboard() {
  const { stats, loading } = useCreatorStats(userId);

  if (loading) return <div>Loading stats...</div>;

  return (
    <div>
      <h2>Your Stats</h2>
      <p>Total Videos: {stats.total_videos}</p>
      <p>Total Views: {stats.total_views.toLocaleString()}</p>
      <p>Total Revenue: ${stats.total_revenue.toFixed(2)}</p>
    </div>
  );
}
```

### Upload Video

```typescript
import { uploadVideo, createVideo } from './services';

async function handleUpload(videoFile: File, thumbnailFile: File) {
  // Upload video file
  const videoResult = await uploadVideo(videoFile, (progress) => {
    console.log(`Upload: ${progress.percentage}%`);
  });

  if (videoResult.error) {
    alert(videoResult.error);
    return;
  }

  // Upload thumbnail
  const thumbResult = await uploadThumbnail(thumbnailFile);

  // Create video record
  const result = await createVideo({
    title: 'My Awesome Video',
    description: 'Check this out!',
    video_url: videoResult.data.url,
    thumbnail_url: thumbResult.data.url,
    duration: 1800,
    price: 4.99,
    category: 'Education'
  });

  console.log('Video created:', result.data);
}
```

### Unlock Video

```typescript
import { usePayment } from './hooks/usePayment';

function VideoPlayer({ videoId }) {
  const { unlockVideo, loading } = usePayment();

  const handleUnlock = async () => {
    const result = await unlockVideo(videoId, 'mock');
    
    if (result.error) {
      alert(result.error);
    } else {
      alert('Video unlocked!');
    }
  };

  return (
    <div>
      <button onClick={handleUnlock} disabled={loading}>
        {loading ? 'Processing...' : 'Unlock Video ($4.99)'}
      </button>
    </div>
  );
}
```

---

## 📊 Database Schema

### Core Tables

**users** - User profiles and authentication
```sql
id, username, email, role, profile_image_url, wallet_address, bio
```

**videos** - Video content and metadata
```sql
id, creator_id, title, description, video_url, thumbnail_url, 
duration, price, views, clicks, is_promoted, category, tags
```

**creator_stats** - Real-time creator analytics
```sql
creator_id, total_videos, total_views, total_clicks, total_revenue
```

**transactions** - Payment records
```sql
id, user_id, video_id, creator_id, amount, status, payment_method
```

**video_unlocks** - Access control
```sql
id, user_id, video_id, transaction_id, unlocked_at
```

**video_views** - View tracking
```sql
id, video_id, user_id, watched_duration, created_at
```

---

## 🔐 Security

### Row Level Security (RLS)

All tables have RLS policies:

✅ Users can read all profiles, update only their own  
✅ Videos are public, but only creators can modify their own  
✅ Stats are public read, owner-only update  
✅ Transactions visible only to participants  
✅ Unlocks visible only to the user  

### File Upload Security

✅ File size limits enforced (500MB videos, 5MB images)  
✅ MIME type validation  
✅ Sanitized filenames  
✅ User-scoped storage paths  

---

## 🎨 TypeScript Types

All entities are fully typed:

```typescript
import type {
  User,
  Video,
  VideoWithCreator,
  CreatorStats,
  CreatorAnalytics,
  Transaction,
  ApiResponse,
  PaginatedResponse
} from './types/supabase';
```

Every service function returns `ApiResponse<T>`:
```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
}
```

---

## 🔧 Services API

### Authentication Service
- `signUp()` - Create account
- `signIn()` - Login
- `signOut()` - Logout
- `getCurrentUser()` - Get profile
- `updateUserProfile()` - Update profile
- `changePassword()` - Change password
- `resetPassword()` - Send reset email

### Video Service
- `getVideos()` - Fetch with filters/pagination
- `getTrendingVideos()` - Get promoted
- `getTopVideos()` - Get by views
- `getVideoById()` - Single video
- `createVideo()` - Upload
- `updateVideo()` - Edit
- `deleteVideo()` - Remove
- `incrementVideoViews()` - Track view

### Analytics Service
- `getCreatorStats()` - Real-time stats
- `getCreatorAnalytics()` - Full dashboard
- `getVideoAnalytics()` - Per-video metrics
- `getCreatorTransactions()` - Payment history
- `getUserUnlockedVideos()` - Purchased videos
- `getUserViewingHistory()` - Watch history

### Payment Service
- `unlockVideo()` - Purchase video
- `isVideoUnlocked()` - Check access
- `getUserTransactions()` - User payments
- `getCreatorEarnings()` - Revenue summary
- `refundTransaction()` - Process refund

### Storage Service
- `uploadVideo()` - Upload video file
- `uploadThumbnail()` - Upload image
- `uploadProfileImage()` - Upload avatar
- `deleteFile()` - Remove file
- `getVideoDuration()` - Extract duration
- `createThumbnailFromVideo()` - Auto-generate

---

## 🎣 React Hooks

### `useAuth()`
Manages authentication state with real-time updates.

```typescript
const {
  user,              // Current user or null
  loading,           // Auth loading state
  error,             // Auth error message
  signUp,            // Sign up function
  signIn,            // Sign in function
  signOut,           // Sign out function
  updateProfile,     // Update profile function
  isAuthenticated,   // Boolean: logged in?
  isCreator,         // Boolean: user is creator?
  isViewer           // Boolean: user is viewer?
} = useAuth();
```

### `useVideos(filters, pagination)`
Fetches videos with optional filtering and pagination.

```typescript
const {
  videos,   // Array of videos
  loading,  // Loading state
  error,    // Error message
  hasMore,  // More pages available?
  total,    // Total count
  refetch   // Refetch function
} = useVideos({ category: 'Tech' }, { page: 1, limit: 20 });
```

### `useCreatorStats(creatorId)`
Real-time creator statistics with Supabase Realtime.

```typescript
const {
  stats,    // Creator stats object
  loading,  // Loading state
  error,    // Error message
  refetch   // Refetch function
} = useCreatorStats(userId);
```

### `usePayment()`
Handle payments and unlocks.

```typescript
const {
  unlockVideo,        // Unlock function
  checkVideoUnlocked, // Check access
  loading,            // Payment processing
  error               // Error message
} = usePayment();
```

---

## 📈 Real-time Updates

Enable real-time subscriptions for live data:

```typescript
import { supabase } from './lib/supabase';

// Subscribe to video views
const subscription = supabase
  .channel('video_changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'videos',
      filter: `id=eq.${videoId}`
    },
    (payload) => {
      console.log('Video updated:', payload.new);
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

---

## 🚀 Performance

### Database Indexes
✅ All foreign keys indexed  
✅ Search fields indexed (category, created_at, views)  
✅ Optimized for common queries  

### Caching Recommendations
- Use React Query or SWR for client-side caching
- Cache trending/top videos (5-minute TTL)
- Cache user unlocks to avoid repeated checks

### Optimization Tips
- Use pagination for large datasets
- Lazy load images and videos
- Implement infinite scroll with `hasMore` flag
- Subscribe to real-time only when needed

---

## 🔮 Future Integrations

### Stripe Payments
Replace mock payment with Stripe:
```typescript
// src/services/payment.service.ts
export async function processStripePayment(videoId, amount) {
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    body: JSON.stringify({ videoId, amount })
  });
  return response.json();
}
```

### Solana Pay
Enable crypto payments:
```typescript
import { createTransferInstruction } from '@solana/spl-token';
// Implement Solana Pay flow
```

### Video Processing
Add transcoding with Cloudflare Stream or Mux:
```typescript
const response = await fetch('https://api.cloudflare.com/client/v4/accounts/{account_id}/stream', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_TOKEN' },
  body: videoFile
});
```

---

## 📚 Documentation

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Complete setup guide
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Full API documentation
- **[Supabase Docs](https://supabase.com/docs)** - Official Supabase documentation

---

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use existing service patterns
3. Add JSDoc comments for new functions
4. Test with real Supabase project before committing

---

## 📄 License

MIT License - Built for Flix platform

---

## 🎉 You're Ready!

Your backend is now complete and production-ready. Key features:

✅ Full authentication system  
✅ Video management with CRUD operations  
✅ Real-time analytics and stats  
✅ Payment system (mock, ready for Stripe/Solana)  
✅ File uploads with validation  
✅ Row Level Security for data protection  
✅ TypeScript types for type safety  
✅ React hooks for easy integration  
✅ Comprehensive documentation  

**Next Steps:**
1. Set up your Supabase project ([SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
2. Configure environment variables
3. Integrate hooks into your React components
4. Build your UI with the YouTube-style design
5. Deploy to production!

Happy coding! 🚀
