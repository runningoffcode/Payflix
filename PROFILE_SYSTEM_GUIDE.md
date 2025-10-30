# 👤 Profile System - Complete Setup Guide

Your PayFlix platform now has a **full profile system** with wallet integration, profile pictures, and customizable usernames!

---

## 🎉 What's Been Implemented

### ✅ Frontend Features
- **[src/pages/Profile.tsx](src/pages/Profile.tsx)** - Complete profile page with editing
- **[src/components/Sidebar.tsx](src/components/Sidebar.tsx)** - Profile picture display
- **Wallet Integration** - Connected to Solana wallet adapter
- **Profile Picture Upload** - With preview and validation
- **Username Editing** - Customizable display name
- **Stats Dashboard** - Videos owned, spent, earnings
- **Edit Mode** - Toggle between view and edit
- **Real-time Updates** - Profile syncs across the app

### ✅ Backend Features
- **[server/routes/users.routes.ts](server/routes/users.routes.ts)** - Profile API endpoints
- **File Upload** - Multer middleware for images
- **Supabase Storage** - Profile pictures stored in cloud
- **Database Integration** - Profile data persisted
- **Public URLs** - Profile pictures accessible via CDN

### ✅ Features Included
- Profile picture upload (max 5MB)
- Username customization
- Wallet address display
- Creator badge
- Stats tracking (videos owned, spent, created, earnings)
- Edit/Save/Cancel workflow
- Image preview before upload
- Responsive design
- Error handling

---

## 🚀 Setup Instructions

### Step 1: Setup Supabase Storage Bucket

Run this SQL in your **Supabase SQL Editor**:

```bash
# Open SETUP_PROFILE_STORAGE.sql and execute it in Supabase
```

Or manually:
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `profile-pictures`
3. Make it **public**
4. Apply the policies from `SETUP_PROFILE_STORAGE.sql`

### Step 2: Environment Variables

Ensure your `.env` file has:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### Step 3: Start the Application

```bash
npm run dev
```

---

## 💡 How to Use

### For Users:

1. **Connect Your Wallet**
   - Click "Connect Wallet" in sidebar
   - Select Phantom/Solflare
   - Approve connection

2. **View Your Profile**
   - Click Profile link in sidebar (bottom)
   - Or navigate to `/profile`

3. **Edit Your Profile**
   - Click "Edit Profile" button
   - Click camera icon to upload profile picture
   - Enter your username
   - Click "Save Changes"

4. **Profile Features**
   - View your stats (videos owned, total spent)
   - See creator stats if you're a creator
   - Browse your video library
   - Access creator dashboard

---

## 🎨 Profile Page Features

### View Mode
```tsx
- Profile picture (or gradient avatar with first letter)
- Username display
- Wallet address (truncated)
- Creator badge (if applicable)
- "Edit Profile" button
- "Become a Creator" button (if not creator)
- Stats cards:
  - Videos Owned
  - Total Spent
  - Videos Created (creators only)
  - Total Earnings (creators only)
- My Library section
```

### Edit Mode
```tsx
- Upload profile picture
  - Click camera icon on avatar
  - Preview before save
  - Max 5MB
  - Images only (JPG, PNG, GIF, WebP)
- Edit username
  - Text input field
  - No character limit
- Wallet address (read-only)
- "Save Changes" button with loading state
- "Cancel" button
```

---

## 📱 Profile Picture Display

### Sidebar Integration
- Profile pictures show in sidebar
- Fallback to gradient avatar with first letter
- Shows username next to avatar
- Updates in real-time after editing

### Avatar Fallback
If no profile picture:
- Gradient circle (purple→pink)
- First letter of username/wallet
- Consistent across all components

---

## 🔧 API Endpoints

### GET `/api/users/profile`
Get user profile by wallet address

**Headers:**
```json
{
  "x-wallet-address": "user_wallet_address"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "wallet_address": "...",
    "username": "CryptoUser",
    "profile_picture_url": "https://...",
    "is_creator": false
  },
  "stats": {
    "videosOwned": 5,
    "totalSpent": 12.99,
    "videosCreated": 0,
    "totalEarnings": 0
  }
}
```

### PUT `/api/users/update-profile`
Update user profile

**Headers:**
```json
{
  "x-wallet-address": "user_wallet_address"
}
```

**Body (multipart/form-data):**
```
username: string
profilePicture: File (optional)
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "wallet_address": "...",
    "username": "NewUsername",
    "profile_picture_url": "https://...",
    "is_creator": false
  }
}
```

---

## 🎯 Technical Details

### File Upload Flow

1. **Frontend Selection**
   ```tsx
   - User clicks camera icon
   - File input opens
   - User selects image
   - Validation runs (type, size)
   - Preview generated
   ```

2. **Upload Process**
   ```tsx
   - Form submitted with FormData
   - Multer middleware processes file
   - File stored in memory
   - Uploaded to Supabase Storage
   - Public URL generated
   - Database updated
   ```

3. **Storage Structure**
   ```
   profile-pictures/
   ├── {user_id}-{timestamp}.jpg
   ├── {user_id}-{timestamp}.png
   └── ...
   ```

### Validation

**File Type:**
- Only images allowed
- Checked by MIME type
- Frontend + Backend validation

**File Size:**
- Maximum 5MB
- Checked before upload
- Error message if exceeded

**Username:**
- No restrictions (for now)
- Can add validation later
- Stored as-is in database

---

## 🔐 Security

### Authentication
- Wallet signature verification
- x-wallet-address header required
- Only owner can update profile

### Storage Policies
- Public read access (profile pictures)
- Authenticated write access
- Users can only modify own pictures
- Service role key for backend uploads

### File Upload Security
- MIME type validation
- File size limits
- Unique filenames (prevents overwrites)
- Secure storage bucket

---

## 🎨 UI Components Used

### GradientButton
```tsx
<GradientButton onClick={handleSave}>
  Save Changes
</GradientButton>
```

### Motion Animations
```tsx
- Fade in effects
- Slide transitions
- Loading states
- Smooth page enters
```

### Responsive Design
```tsx
- Mobile-first approach
- Collapsible edit forms
- Adaptive layouts
- Touch-friendly buttons
```

---

## 🐛 Troubleshooting

### Profile Picture Not Uploading

**Check:**
1. Supabase storage bucket exists (`profile-pictures`)
2. Bucket is public
3. Storage policies applied
4. Environment variables set
5. File size < 5MB
6. File is an image

**Solution:**
```bash
# Re-run the storage setup SQL
cat SETUP_PROFILE_STORAGE.sql | pbcopy
# Paste in Supabase SQL Editor
```

### Profile Not Loading

**Check:**
1. Wallet connected
2. Backend server running
3. Database has user record
4. Network tab for API errors

**Solution:**
```bash
# Check server logs
npm run dev:server

# Check browser console
# F12 → Console tab
```

### Image Preview Not Showing

**Check:**
1. File is valid image
2. Browser supports FileReader API
3. No console errors

**Solution:**
- Try different image format
- Reduce file size
- Clear browser cache

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  profile_picture_url TEXT,
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Storage Bucket
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true);
```

---

## 🚀 Next Steps

### Enhancements You Could Add:

1. **Profile Customization**
   - Bio/description field
   - Social media links
   - Custom banner images
   - Theme preferences

2. **Social Features**
   - Follow/unfollow creators
   - Creator profiles (public view)
   - Activity feed
   - Comments/likes

3. **Advanced Settings**
   - Email notifications
   - Privacy settings
   - Linked wallets
   - 2FA options

4. **Creator Features**
   - Verified badge
   - Creator analytics
   - Subscriber management
   - Earnings dashboard

---

## 💡 Usage Examples

### Custom Profile Component
```tsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';

function UserAvatar({ size = 'md' }) {
  const { publicKey } = useWallet();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (publicKey) {
      fetchProfile();
    }
  }, [publicKey]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
  };

  return profile?.profile_picture_url ? (
    <img
      src={profile.profile_picture_url}
      className={`${sizeClasses[size]} rounded-full`}
    />
  ) : (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold`}>
      {profile?.username?.[0] || 'U'}
    </div>
  );
}
```

### Check if User Has Profile
```tsx
async function hasProfile(walletAddress: string) {
  const response = await fetch('http://localhost:5000/api/users/profile', {
    headers: { 'x-wallet-address': walletAddress }
  });
  return response.ok;
}
```

---

## ✨ Success!

Your PayFlix profile system is now complete and ready to use!

**Features Working:**
✅ Wallet connection
✅ Profile viewing
✅ Profile editing
✅ Picture uploads
✅ Username changes
✅ Stats tracking
✅ Sidebar integration
✅ Real-time updates

**Test It:**
1. Connect your wallet
2. Navigate to `/profile`
3. Click "Edit Profile"
4. Upload a picture
5. Change your username
6. Save and see updates everywhere!

Happy customizing! 🎉
