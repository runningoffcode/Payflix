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
