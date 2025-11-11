# Wallet & Profile Operations Playbook

This playbook consolidates wallet connection fixes, creator wallet validation, and the full profile system guide. It merges `WALLET_CONNECTION_GUIDE.md`, `WALLET_FIX_GUIDE.md`, and `PROFILE_SYSTEM_GUIDE.md` while preserving their verbatim content in appendices.

## Overview

- Solana wallet adapters (Phantom, Solflare, Ledger) are auto-configured for Devnet via `VITE_SOLANA_RPC_URL`.
- Creator uploads enforce wallet/JWT parity to prevent misassigned videos; helper scripts allow remediation.
- The profile system ties wallet identities to Supabase profiles, avatars, and stats, with storage policies defined in `SETUP_PROFILE_STORAGE.sql`.

## Connection Flow

1. User installs Phantom/Solflare and switches to Devnet.
2. Frontend uses `@solana/wallet-adapter-react` with `autoConnect=true`.
3. Upon connection the UI shows wallet address, balance, and authentication status.
4. Troubleshooting focuses on RPC env vars, Devnet selection, and USDC faucet funding.

## Creator Wallet Integrity

- Frontend pre-upload check ensures `connectedWallet === authenticatedWallet`.
- Server logs print JWT wallet vs DB owner for every upload (`video-upload-v2.routes.ts`).
- Scripts:
  - `npx ts-node scripts/list-videos.ts [wallet]`
  - `npx ts-node scripts/reassign-video-creator.ts <video-id> <wallet>`
- Recommended procedure: disconnect old wallet, refresh, connect new wallet before uploads.

## Profile System Highlights

- `/profile` page manages username, avatar upload, stats, and creator badge.
- Supabase `profile-pictures` bucket handles avatar storage with public read + secured writes.
- API endpoints:
  - `GET /api/users/profile` (requires `x-wallet-address` header)
  - `PUT /api/users/update-profile` (multipart form, wallet header)
- Validation: 5 MB image limit, MIME checks, unique filenames.

## Troubleshooting Cheatsheet

| Problem                          | Likely Cause                   | Fix                                                 |
| -------------------------------- | ------------------------------ | --------------------------------------------------- |
| Wallet modal missing Phantom     | Extension locked/not installed | Install/unlock Phantom, refresh                     |
| Auth mismatch                    | Old JWT cached                 | Disconnect, refresh, reconnect wallet               |
| Videos assigned to wrong creator | Wallet swap mid-session        | Use scripts to reassign + follow recommended flow   |
| Profile picture not uploading    | Bucket/policy missing          | Re-run `SETUP_PROFILE_STORAGE.sql`, verify env vars |

## Roadmap

- Add mainnet RPC selection + environment toggles.
- Centralize diagnostics scripts under `scripts/diagnostics/` and document usage.
- Expose public profile view with social features per Appendix suggestions.

---

## Appendices (Historical Docs)

### Appendix A — WALLET_CONNECTION_GUIDE.md (verbatim)

# Wallet Connection Guide

## What I Fixed

Your Phantom wallet wasn't connecting because of a missing environment variable. The issue has been resolved with these changes:

### 1. **Environment Variable Fix**

- ✅ Added `VITE_SOLANA_RPC_URL` to your `.env` file
- In Vite, all client-side environment variables must be prefixed with `VITE_`
- The app now correctly uses the Solana Devnet RPC endpoint

### 2. **Wallet Provider Improvements**

- ✅ Enabled `autoConnect={true}` to automatically reconnect your wallet
- ✅ Added multiple wallet options (Phantom, Solflare, Torus, Ledger)
- ✅ Improved wallet adapter configuration with proper network settings

### 3. **UI Enhancements**

- ✅ Added prominent "Connect Wallet" button on Home page
- ✅ Shows connection status with animated indicator
- ✅ Displays wallet address when connected
- ✅ Includes link to download Phantom wallet if needed

## How to Connect Your Wallet

1. **Install Phantom Wallet** (if you haven't already)
   - Visit: https://phantom.app/
   - Install the browser extension
   - Create or import a wallet
   - Switch to Devnet in Phantom settings

2. **Connect to PayFlix**
   - Open PayFlix in your browser
   - Click the purple "Connect Wallet" button in the top right
   - Select "Phantom" from the wallet modal
   - Approve the connection in the Phantom popup

3. **Verify Connection**
   - You should see your wallet address (e.g., "5x3F...kL9q")
   - A green dot indicates successful connection
   - Your USDC balance will appear in the sidebar

## Troubleshooting

### Phantom Wallet Not Appearing in Modal

**Problem**: The wallet modal opens but doesn't show Phantom
**Solution**:

1. Make sure Phantom extension is installed
2. Refresh the page
3. Click the Phantom icon in your browser toolbar to unlock it
4. Try connecting again

### Connection Keeps Failing

**Problem**: Connection attempts repeatedly fail
**Solution**:

1. Check that Phantom is set to **Devnet** (not Mainnet)
   - Open Phantom → Settings → Developer Settings → Testnet Mode
2. Clear your browser cache and reload
3. Try disconnecting and reconnecting

### "Transaction Failed" When Making Payments

**Problem**: USDC payment fails with error
**Solution**:

1. Get Devnet USDC from the faucet:
   ```bash
   # Get USDC on Devnet
   spl-token transfer --fund-recipient \
     4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
     <amount> \
     <your-wallet-address>
   ```
2. Or use: https://spl-token-faucet.com/

### Wallet Connects But Balance Shows $0.00

**Problem**: Connected but USDC balance is zero
**Solution**:

1. This is normal if you haven't received Devnet USDC yet
2. Follow the USDC setup guide (Appendix D in `docs/infra/auth.md`)
3. Get free Devnet USDC from faucets

## Testing the Connection

After connecting, you should be able to:

✅ See your wallet address in the sidebar
✅ View your USDC balance
✅ Click on videos to unlock with USDC payment
✅ Access your profile page
✅ Upload videos in Creator Studio (if you're a creator)

## Network Configuration

- **Network**: Devnet
- **RPC Endpoint**: https://api.devnet.solana.com
- **USDC Mint**: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

## Next Steps

1. ✅ Wallet connection is now fixed
2. Get Devnet SOL for transaction fees (from Solana faucet)
3. Get Devnet USDC for video purchases (see Appendix D in `docs/infra/auth.md`)
4. Start exploring videos!

## Still Having Issues?

If you're still experiencing problems:

1. **Check browser console** (F12) for error messages
2. **Verify Phantom is on Devnet** in settings
3. **Try a different browser** (Chrome, Brave, Firefox)
4. **Disable other wallet extensions** that might conflict

## Technical Details

The wallet connection uses:

- `@solana/wallet-adapter-react`: Wallet hooks
- `@solana/wallet-adapter-react-ui`: Wallet modal UI
- `@solana/wallet-adapter-wallets`: Wallet adapters (Phantom, Solflare, etc.)
- Auto-reconnect enabled for seamless experience

Connection flow:

1. User clicks "Connect Wallet"
2. Wallet modal opens with available wallets
3. User selects Phantom
4. Phantom prompts for approval
5. App receives public key and connection status
6. Balance fetching and profile loading happen automatically

### Appendix B — WALLET_FIX_GUIDE.md (verbatim)

# Video Creator Wallet Assignment Fix

## Problem

Videos were uploaded with the wrong creator wallet due to cached JWT tokens from previous wallet sessions.

## Solution Implemented

### 1. Enhanced Logging (Backend)

- Added detailed wallet verification logs in [server/routes/video-upload-v2.routes.ts](server/routes/video-upload-v2.routes.ts)
- Shows JWT wallet, user ID, and database record information during upload
- Helps debug wallet mismatches

### 2. Wallet Validation (Frontend)

- Added pre-upload validation in [src/pages/CreatorDashboard.tsx](src/pages/CreatorDashboard.tsx)
- Verifies connected wallet matches authenticated user before upload
- Prevents uploading with wrong JWT token
- Shows clear error messages if mismatch detected

### 3. Helper Scripts

Created two utility scripts to fix existing videos:

#### List All Videos

```bash
# List all videos with creator info
npx ts-node scripts/list-videos.ts

# List videos by specific creator
npx ts-node scripts/list-videos.ts <wallet-address>
```

#### Reassign Video Creator

```bash
# Reassign a video to the correct creator
npx ts-node scripts/reassign-video-creator.ts <video-id> <correct-wallet-address>
```

## How to Fix Your Videos

### Step 1: List All Videos

Run this to see all videos and their current creators:

```bash
npx ts-node scripts/list-videos.ts
```

This will show:

- All videos grouped by creator
- Creator wallet addresses
- Creator usernames
- Video IDs

### Step 2: Identify Misassigned Videos

Look for videos showing under "payflixdotfun" wallet that should be under "J3WmMHUi" wallet.

### Step 3: Reassign Videos

For each misassigned video, run:

```bash
npx ts-node scripts/reassign-video-creator.ts <video-id> J3WmMHUiMx...
```

Example:

```bash
# If the script shows this video is under the wrong creator:
# Video ID: video_1762039697837_5ajsoc

# Reassign it to your J3 wallet:
npx ts-node scripts/reassign-video-creator.ts video_1762039697837_5ajsoc J3WmMHUiMx...
```

Replace `J3WmMHUiMx...` with your full J3 wallet address.

### Step 4: Verify the Fix

Run the list script again to verify:

```bash
npx ts-node scripts/list-videos.ts J3WmMHUiMx...
```

This should now show all your videos under your J3 wallet.

## Prevention (Going Forward)

The fixes I implemented will prevent this issue from happening again:

1. **Automatic Validation**: The upload form now validates that your connected wallet matches your authentication before allowing upload

2. **Clear Error Messages**: If there's a mismatch, you'll see:

   > ⚠️ Authentication mismatch detected. Please disconnect and reconnect your wallet.

3. **Enhanced Logging**: Server logs will show exactly which wallet is uploading, making it easy to debug

## Recommendations

### When Switching Wallets:

1. **Disconnect** your current wallet completely
2. **Refresh** the page
3. **Connect** the new wallet
4. **Wait** for the authentication to complete (you'll see your username in the header)
5. **Then upload** your videos

### If You See "Authentication Required":

- Refresh the page
- Reconnect your wallet
- Wait for authentication to complete

### If Videos Still Show Wrong Creator:

- Check browser console logs (F12) for wallet mismatch warnings
- Disconnect and reconnect wallet
- Use the reassignment script to fix existing videos

## Technical Details

### What Caused the Issue

1. User connects with Wallet A (payflixdotfun)
2. Authentication creates JWT token for Wallet A
3. User switches to Wallet B (J3) without refreshing
4. Old JWT token (Wallet A) still in localStorage
5. Upload uses old JWT → video assigned to Wallet A

### How It's Fixed

1. Frontend validates `user.walletAddress === connectedWalletAddress` before upload
2. Backend logs show exactly which wallet is in JWT vs database
3. Scripts allow manual reassignment of misassigned videos

## Need Help?

If you encounter issues:

1. Check server logs during upload
2. Check browser console for wallet mismatch errors
3. Use the list-videos script to see current state
4. Run reassignment script to fix videos

---

**Created:** $(date)
**Issue:** Videos uploaded with J3 wallet showing as payflixdotfun creator
**Status:** Fixed with validation + helper scripts

### Appendix C — PROFILE_SYSTEM_GUIDE.md (verbatim)

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
<GradientButton onClick={handleSave}>Save Changes</GradientButton>
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
import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";

function UserAvatar({ size = "md" }) {
  const { publicKey } = useWallet();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (publicKey) {
      fetchProfile();
    }
  }, [publicKey]);

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-xl",
  };

  return profile?.profile_picture_url ? (
    <img
      src={profile.profile_picture_url}
      className={`${sizeClasses[size]} rounded-full`}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold`}
    >
      {profile?.username?.[0] || "U"}
    </div>
  );
}
```

### Check if User Has Profile

```tsx
async function hasProfile(walletAddress: string) {
  const response = await fetch("http://localhost:5000/api/users/profile", {
    headers: { "x-wallet-address": walletAddress },
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
