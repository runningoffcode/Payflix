# Flix API Reference

Complete API reference for all backend services.

## Table of Contents
- [Authentication](#authentication)
- [Videos](#videos)
- [Analytics](#analytics)
- [Payments](#payments)
- [Storage](#storage)

---

## Authentication

### Sign Up
Create a new user account.

```typescript
import { signUp } from './services/auth.service';

const result = await signUp(
  'user@example.com',
  'password123',
  {
    username: 'johndoe',
    role: 'creator', // or 'viewer'
    wallet_address: 'optional_solana_address'
  }
);

if (result.error) {
  console.error(result.error);
} else {
  console.log('User created:', result.data);
}
```

**Response:**
```typescript
{
  data: User | null,
  error: string | null,
  message?: string
}
```

### Sign In
Authenticate existing user.

```typescript
import { signIn } from './services/auth.service';

const result = await signIn('user@example.com', 'password123');
```

### Sign Out
Log out current user.

```typescript
import { signOut } from './services/auth.service';

const result = await signOut();
```

### Get Current User
Fetch authenticated user profile.

```typescript
import { getCurrentUser } from './services/auth.service';

const result = await getCurrentUser();
```

### Update Profile
Update user profile information.

```typescript
import { updateUserProfile } from './services/auth.service';

const result = await updateUserProfile(userId, {
  username: 'newusername',
  bio: 'Content creator',
  profile_image_url: 'https://...'
});
```

---

## Videos

### Get All Videos
Fetch videos with optional filters and pagination.

```typescript
import { getVideos } from './services/video.service';

const result = await getVideos(
  {
    category: 'Technology',
    min_price: 0,
    max_price: 10,
    search: 'tutorial',
    is_promoted: true
  },
  {
    page: 1,
    limit: 20,
    sort_by: 'views',
    order: 'desc'
  }
);

console.log(result.data.data); // Array of videos
console.log(result.data.total); // Total count
console.log(result.data.hasMore); // More pages available?
```

**Filters:**
- `category?: string`
- `creator_id?: string`
- `min_price?: number`
- `max_price?: number`
- `is_promoted?: boolean`
- `tags?: string[]`
- `search?: string`

**Pagination:**
- `page?: number` (default: 1)
- `limit?: number` (default: 20)
- `sort_by?: 'views' | 'created_at' | 'price' | 'title'`
- `order?: 'asc' | 'desc'`

### Get Trending Videos
Fetch promoted videos sorted by engagement.

```typescript
import { getTrendingVideos } from './services/video.service';

const result = await getTrendingVideos(20); // limit
```

### Get Top Videos
Fetch videos sorted by view count.

```typescript
import { getTopVideos } from './services/video.service';

const result = await getTopVideos(20);
```

### Get Video by ID
Fetch single video with creator info.

```typescript
import { getVideoById } from './services/video.service';

const result = await getVideoById('video-uuid');
```

### Create Video
Upload new video (must be authenticated as creator).

```typescript
import { createVideo } from './services/video.service';

const result = await createVideo({
  title: 'How to Build Apps',
  description: 'Complete tutorial',
  video_url: 'https://storage.../video.mp4',
  thumbnail_url: 'https://storage.../thumb.jpg',
  duration: 1800, // in seconds
  price: 4.99,
  category: 'Education',
  tags: ['tutorial', 'coding', 'react'],
  is_promoted: false
});
```

### Update Video
Edit video metadata (creators only).

```typescript
import { updateVideo } from './services/video.service';

const result = await updateVideo('video-uuid', {
  title: 'Updated Title',
  price: 9.99,
  is_promoted: true
});
```

### Delete Video
Remove video (creators only).

```typescript
import { deleteVideo } from './services/video.service';

const result = await deleteVideo('video-uuid');
```

### Increment Video Views
Track video view.

```typescript
import { incrementVideoViews } from './services/video.service';

const result = await incrementVideoViews(
  'video-uuid',
  'user-uuid', // optional
  120 // watched duration in seconds (optional)
);
```

### Check Video Access
Verify if user has access to video.

```typescript
import { checkVideoAccess } from './services/video.service';

const result = await checkVideoAccess('video-uuid', 'user-uuid');
console.log(result.data); // true or false
```

---

## Analytics

### Get Creator Stats
Fetch real-time creator statistics.

```typescript
import { getCreatorStats } from './services/analytics.service';

const result = await getCreatorStats('creator-uuid');

console.log(result.data);
// {
//   creator_id: string,
//   total_videos: number,
//   total_views: number,
//   total_clicks: number,
//   total_revenue: number,
//   updated_at: string
// }
```

### Get Creator Analytics
Full dashboard data with trends and top videos.

```typescript
import { getCreatorAnalytics } from './services/analytics.service';

const result = await getCreatorAnalytics('creator-uuid');

console.log(result.data);
// {
//   total_videos: number,
//   total_views: number,
//   total_clicks: number,
//   total_revenue: number,
//   views_trend: Array<{ date: string, views: number }>,
//   revenue_trend: Array<{ date: string, revenue: number }>,
//   top_videos: VideoWithCreator[]
// }
```

### Get Video Analytics
Per-video analytics and metrics.

```typescript
import { getVideoAnalytics } from './services/analytics.service';

const result = await getVideoAnalytics('video-uuid');

console.log(result.data);
// {
//   video_id: string,
//   views: number,
//   clicks: number,
//   revenue: number,
//   views_by_date: Record<string, number>,
//   avg_watch_duration: number
// }
```

### Get Creator Transactions
Recent payment transactions for creator.

```typescript
import { getCreatorTransactions } from './services/analytics.service';

const result = await getCreatorTransactions('creator-uuid', 10);
```

### Get User Unlocked Videos
Videos purchased by user.

```typescript
import { getUserUnlockedVideos } from './services/analytics.service';

const result = await getUserUnlockedVideos('user-uuid');
```

### Get Viewing History
User's watch history.

```typescript
import { getUserViewingHistory } from './services/analytics.service';

const result = await getUserViewingHistory('user-uuid', 20);
```

---

## Payments

### Unlock Video
Purchase/unlock a paid video.

```typescript
import { unlockVideo } from './services/payment.service';

const result = await unlockVideo(
  'video-uuid',
  'mock' // payment method: 'mock' | 'stripe' | 'solana' | 'usdc'
);

if (result.error) {
  console.error(result.error);
} else {
  console.log('Video unlocked!', result.data);
}
```

### Check if Video is Unlocked
Verify unlock status.

```typescript
import { isVideoUnlocked } from './services/payment.service';

const result = await isVideoUnlocked('video-uuid', 'user-uuid');
console.log(result.data); // true or false
```

### Get Transaction
Fetch single transaction details.

```typescript
import { getTransaction } from './services/payment.service';

const result = await getTransaction('transaction-uuid');
```

### Get User Transactions
User's payment history.

```typescript
import { getUserTransactions } from './services/payment.service';

const result = await getUserTransactions('user-uuid', 20);
```

### Refund Transaction
Process refund (admin/creator only).

```typescript
import { refundTransaction } from './services/payment.service';

const result = await refundTransaction('transaction-uuid');
```

### Get Creator Earnings
Creator revenue summary.

```typescript
import { getCreatorEarnings } from './services/payment.service';

const result = await getCreatorEarnings('creator-uuid');

console.log(result.data);
// {
//   total_earnings: number,
//   pending_earnings: number,
//   completed_earnings: number,
//   total_transactions: number
// }
```

---

## Storage

### Upload Video
Upload video file to Supabase Storage.

```typescript
import { uploadVideo } from './services/storage.service';

const result = await uploadVideo(
  videoFile, // File object
  (progress) => {
    console.log(`${progress.percentage}% uploaded`);
  }
);

console.log(result.data);
// {
//   url: string,
//   path: string,
//   size: number
// }
```

**Constraints:**
- Max size: 500MB
- Formats: MP4, WebM, OGG, MOV, MKV

### Upload Thumbnail
Upload thumbnail image.

```typescript
import { uploadThumbnail } from './services/storage.service';

const result = await uploadThumbnail(imageFile);
```

**Constraints:**
- Max size: 5MB
- Formats: JPEG, PNG, WebP

### Upload Profile Image
Upload user avatar.

```typescript
import { uploadProfileImage } from './services/storage.service';

const result = await uploadProfileImage(imageFile);
```

### Delete File
Remove file from storage.

```typescript
import { deleteFile, STORAGE_BUCKETS } from './services/storage.service';

const result = await deleteFile(STORAGE_BUCKETS.VIDEOS, 'file-path');
```

### Get File URL
Generate public URL for file.

```typescript
import { getFileUrl, STORAGE_BUCKETS } from './services/storage.service';

const url = getFileUrl(STORAGE_BUCKETS.THUMBNAILS, 'user-id/thumb.jpg');
```

### Get Video Duration
Extract video duration from file.

```typescript
import { getVideoDuration } from './services/storage.service';

const duration = await getVideoDuration(videoFile);
console.log(`Duration: ${duration} seconds`);
```

### Create Thumbnail from Video
Auto-generate thumbnail from video.

```typescript
import { createThumbnailFromVideo } from './services/storage.service';

const thumbnailBlob = await createThumbnailFromVideo(videoFile);
```

---

## Error Handling

All services return a consistent response format:

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
}
```

**Usage:**
```typescript
const result = await someService();

if (result.error) {
  // Handle error
  console.error(result.error);
  alert(result.error);
} else {
  // Success
  console.log(result.data);
  if (result.message) {
    console.log(result.message);
  }
}
```

---

## Type Definitions

All TypeScript types are available in `src/types/supabase.ts`:

```typescript
import type {
  User,
  Video,
  VideoWithCreator,
  CreatorStats,
  Transaction,
  ApiResponse,
  PaginatedResponse
} from './types/supabase';
```

---

Built with TypeScript + Supabase
