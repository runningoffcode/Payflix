# Upload & Storage Infrastructure Playbook

This playbook unifies every document related to authentication, creator uploads, and Arweave/Supabase storage. It combines the prior guides (`AUTHENTICATION_UPLOAD_SETUP_COMPLETE.md`, `ARWEAVE_SETUP_GUIDE.md`, `SEAMLESS_UPLOAD_COMPLETE.md`, `UPLOAD_SETUP_GUIDE.md`, and `WEB3_VIDEO_ARCHIVING_GUIDE.md`) into a single reference while keeping their full text in appendices for historical accuracy.

## TL;DR
- Wallet-based JWT auth powers Creator Studio; tokens live for 7 days with a 30-day refresh cycle.
- Creators can run **Quick Listings** (metadata only) or **Full Uploads** (video + thumbnail) against `/api/upload/video`.
- Default dev mode uses local or Supabase storage; production flips to Arweave by supplying a keyfile and AR balance.
- Upload stack is modular: Arweave → permanent storage, Supabase/local → staging, optional R2/S3/IPFS for alternate flows.
- Troubleshooting focuses on JWT readiness, Arweave config, and storage quotas; see appendix checklists for exact remediation.

## Architecture Snapshot
```
Wallet connect → /api/auth/challenge → sign message → /api/auth/login → JWT
      ↓                                                          ↓
Creator Studio (React) --------------------> Upload Service (Express)
      ↓                       ┌────────────┴─────────────┐
Quick Listing (metadata)   Full Upload (video+thumb)   Creator role upgrade
      ↓                          ↓                         ↓
Postgres video table         Storage adapter     Supabase profiles / wallets
```

## Authentication Flow
1. User connects Phantom/Solflare; `AuthContext` auto-requests `/api/auth/challenge`.
2. Wallet signs nonce; `/api/auth/login` verifies and returns JWT.
3. Authenticated React tree (Creator Studio, dashboard panels) reads token from localStorage and injects `Authorization: Bearer <token>` headers.
4. Creator-only actions (`/api/users/become-creator`, `/api/upload/video`) verify JWT and wallet ownership before proceeding.

**Security controls**
- 7-day JWT expiry + refresh tokens.
- Signature verification (dev simplified) with TODO for full Ed25519 validation.
- Creator gating so only approved wallets reach Arweave uploads.

## Upload Modes
### Quick Listing
- Title + price required; description/category optional.
- Writes metadata to Postgres immediately; no storage dependency.
- Ideal for rapid catalog population or when Arweave isn’t configured.

### Full Upload
- Multipart request with `video`, optional `thumbnail`, metadata fields.
- Requires authenticated JWT and configured storage backend.
- Shows progress + success messaging in Creator Studio.

## Configuration Matrix
| Scenario | `ARWEAVE_WALLET_PATH` | `VIDEO_STORAGE_PATH` | Notes |
| --- | --- | --- | --- |
| Dev (no Arweave) | empty | `./storage/videos` | Uses local disk / Supabase fallback |
| Prod (Arweave) | `./keys/arweave-keyfile.json` | optional | Requires funded wallet + gateway config |
| Alt storage (R2/S3/IPFS) | custom adapter | bucket URL | Documented in appendices (Option 3) |

### Env Snippet
```env
ARWEAVE_HOST=arweave.net
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https
ARWEAVE_GATEWAY=https://arweave.net
ARWEAVE_WALLET_PATH=./keys/arweave-keyfile.json
VIDEO_STORAGE_PATH=./storage/videos
```

## Arweave Integration Checklist
1. Install ArConnect, create wallet, export keyfile.
2. Fund wallet (faucet for dev, exchange for prod).
3. Place keyfile under `keys/` and update `.env`.
4. Restart server; upload endpoint logs `✅ Arweave wallet configured` when ready.
5. Monitor AR balance via https://viewblock.io/arweave.

## Testing Playbook
| Test | Steps | Expected |
| --- | --- | --- |
| Quick Listing | Connect wallet → `/creator` → fill title/price → `Create Video Listing` | Instant success toast, entry in DB |
| Auth Flow | Connect wallet → check console for `✅ Logged in successfully` → confirm `flix_auth_token` in localStorage | Token stored, `/api/auth/me` returns profile |
| Become Creator | Connect fresh wallet → attempt upload → accept `Become creator` prompt | Wallet flagged as creator |
| Full Upload | Configure Arweave → upload <50 MB file → watch progress | Upload completes, Arweave tx id logged |
| Arweave fallback | Leave wallet path empty → attempt full upload | Expected failure with warning, quick listing still works |

## Troubleshooting Cheatsheet
- **“Please wait for authentication to complete”** → allow 2–3s for JWT issuance; reconnect wallet if needed.
- **Unauthorized upload** → JWT expired; disconnect/reconnect to refresh token.
- **No Arweave wallet configured** → either configure per checklist or stick to Quick Listing / Supabase storage.
- **Insufficient AR balance** → top up wallet; full uploads pause until balance is non-zero.
- **Port 5000 already in use** → `pkill -f "npm run dev"` before restarting backend.

## Roadmap Notes
- Implement Ed25519 verification and chunked uploads before mainnet.
- Add progress tracking + resumable uploads for large files.
- Integrate analytics, CDN delivery, and richer creator tooling (comments, edits, deletion) per appendix TODOs.

---

## Appendices (Imported Legacy Guides)
The following sections preserve the full historical documents. They are kept verbatim so no implementation detail is lost while we modernize the main narrative.

### Appendix A — AUTHENTICATION_UPLOAD_SETUP_COMPLETE.md (verbatim)

# ✅ Authentication & Arweave Upload Setup - COMPLETE!

## 🎉 What's Been Implemented

### 1. JWT Authentication System ✓
- **AuthContext** (`src/contexts/AuthContext.tsx`)
  - Automatic wallet-based login when connected
  - Stores JWT token in localStorage
  - Auto-refreshes on page reload
  - Sign message verification with wallet

- **Backend Challenge/Response Login** (`server/routes/auth.routes.ts`)
  - POST `/api/auth/challenge` - Get message to sign
  - POST `/api/auth/login` - Verify signature and get JWT
  - GET `/api/auth/me` - Get current authenticated user

### 2. Creator Studio with Authentication ✓
- **Automatic Authentication**
  - Auto-login when wallet connects
  - Prompts to become creator if not already
  - Shows authentication status

- **Dual Upload Modes:**
  1. **Full Video Upload** - Upload video file to Arweave (requires Arweave wallet)
  2. **Quick Listing** - Create video listing without file (for later upload)

### 3. Authenticated Upload Endpoint ✓
- **POST `/api/upload/video`** (requires JWT Bearer token)
  - Multipart form-data upload
  - Supports video file + thumbnail
  - Uploads to Arweave (when configured)
  - Falls back to local storage if Arweave not configured

---

## 🚀 How to Use

### For Development (Without Arweave):

1. **Connect Your Wallet**
   - Go to http://localhost:3001
   - Click "Connect Wallet" button
   - Approve connection in Phantom/Solflare

2. **Go to Creator Studio**
   - Navigate to `/creator` page
   - You'll be automatically logged in with JWT
   - If not a creator, you'll be prompted to become one

3. **Upload Videos** (Two Options):

   **Option A: Quick Listing (No Video File)**
   - Fill in Title and Price (required)
   - Add Description and Category (optional)
   - Click "📝 Create Video Listing"
   - ✅ Creates listing instantly

   **Option B: Full Upload (With Video File)**
   - Select a video file
   - Fill in Title and Price
   - Add optional thumbnail, description, category
   - Click "🚀 Upload Video to Arweave"
   - ⚠️ Requires Arweave wallet to be configured

---

## ⚙️ Configuration

### Current Setup (Development Mode):
```env
# .env file
ARWEAVE_WALLET_KEY=           # Empty - uploads will fail
ARWEAVE_WALLET_PATH=          # Empty - uploads will fail
VIDEO_STORAGE_PATH=./storage/videos  # Local fallback
```

### To Enable Full Arweave Upload:

See [ARWEAVE_SETUP_GUIDE.md](./ARWEAVE_SETUP_GUIDE.md) for detailed instructions.

**Quick Steps:**
1. Get an Arweave wallet from ArConnect
2. Export keyfile JSON
3. Add to project: `mkdir keys && mv arweave-keyfile.json keys/`
4. Update `.env`:
   ```env
   ARWEAVE_WALLET_PATH=./keys/arweave-keyfile.json
   ```
5. Restart server

---

## 🔐 How Authentication Works

### Flow Diagram:
```
1. User connects Solana wallet (Phantom/Solflare)
   ↓
2. Frontend requests challenge from /api/auth/challenge
   ↓
3. Wallet signs the challenge message
   ↓
4. Frontend sends signature to /api/auth/login
   ↓
5. Backend verifies signature (simplified for dev)
   ↓
6. Backend generates JWT token
   ↓
7. Frontend stores JWT in localStorage
   ↓
8. All authenticated requests include: Authorization: Bearer <token>
```

### Security Features:
- ✅ JWT tokens (7-day expiry)
- ✅ Wallet signature verification
- ✅ Protected upload endpoints
- ✅ Creator-only permissions
- ✅ Token refresh support (30-day refresh tokens)

---

## 📁 Files Created/Modified

### Frontend:
- ✅ Created `src/contexts/AuthContext.tsx`
- ✅ Modified `src/App.tsx` - Added AuthProvider
- ✅ Modified `src/pages/CreatorStudio.tsx` - Authenticated uploads

### Backend:
- ✅ Modified `server/routes/auth.routes.ts` - Added challenge endpoint
- ✅ Existing `server/routes/video-upload.routes.ts` - Already had authenticated upload

### Documentation:
- ✅ Created `ARWEAVE_SETUP_GUIDE.md`
- ✅ Created this file: `AUTHENTICATION_UPLOAD_SETUP_COMPLETE.md`

---

## 🧪 Testing the System

### Test 1: Quick Listing (No Video File)
1. Connect wallet
2. Go to Creator Studio → Upload tab
3. Enter: Title = "Test Video", Price = "0.99"
4. Click "📝 Create Video Listing"
5. ✅ Should see success message

### Test 2: Authentication Flow
1. Connect wallet
2. Open browser console (F12)
3. Look for: "✅ Logged in successfully"
4. Check localStorage: `flix_auth_token` should exist

### Test 3: Become Creator
1. Connect as new wallet
2. Try to upload
3. Should prompt: "Become a creator?"
4. Accept and verify role changes

### Test 4: Full Video Upload (If Arweave Configured)
1. Select a small video file (< 50MB for testing)
2. Fill in details
3. Click "🚀 Upload Video to Arweave"
4. Watch progress bar
5. ✅ Should upload to Arweave

---

## ⚠️ Known Limitations

### Current Development Mode:
- **No Arweave wallet** - Full video uploads will fail
- **Simplified signature verification** - For production, implement proper Ed25519 verification
- **Local storage fallback** - Videos stored locally when Arweave unavailable
- **No upload progress** - Add progress tracking for large files

### Production TODO:
- [ ] Implement proper Ed25519 signature verification
- [ ] Add chunked uploads for large files
- [ ] Implement upload progress tracking
- [ ] Add video processing (transcoding, thumbnail generation)
- [ ] Implement video deletion
- [ ] Add video editing capabilities
- [ ] Set up CDN for faster delivery

---

## 🐛 Troubleshooting

### "Please wait for authentication to complete"
- **Cause:** JWT token not yet generated
- **Fix:** Wait 2-3 seconds after connecting wallet

### "Must be logged in to become creator"
- **Cause:** Wallet connected but not authenticated
- **Fix:** Refresh the page and reconnect wallet

### "Upload failed: Unauthorized"
- **Cause:** JWT token expired or invalid
- **Fix:** Disconnect and reconnect wallet to get new token

### "No Arweave wallet configured - uploads will fail"
- **Cause:** ARWEAVE_WALLET_PATH is empty in .env
- **Fix:** See ARWEAVE_SETUP_GUIDE.md or use Quick Listing mode

### Port 5000 already in use
- **Cause:** Multiple dev servers running
- **Fix:** Kill all node processes: `pkill -f "npm run dev"`

---

## 📊 API Endpoints Summary

### Authentication:
- `POST /api/auth/challenge` - Get login challenge
- `POST /api/auth/login` - Login with signature
- `GET /api/auth/me` - Get current user (requires JWT)

### Videos:
- `GET /api/videos` - List all videos
- `POST /api/videos` - Create video listing (no auth required for now)
- `GET /api/videos/:id/stream` - Stream video (402 payment required)

### Upload (Authenticated):
- `POST /api/upload/video` - Upload video to Arweave (requires JWT)
  - Headers: `Authorization: Bearer <token>`
  - Body: multipart/form-data with 'video' file

### Users:
- `POST /api/users/become-creator` - Upgrade to creator (requires JWT)
- `POST /api/users/connect-wallet` - Register wallet

---

## 🎓 Next Steps

### Immediate:
1. **Test the Quick Listing** - Create a video listing without uploading a file
2. **Optional: Set up Arweave** - For full video uploads (see ARWEAVE_SETUP_GUIDE.md)
3. **Test Authentication** - Verify JWT login works in browser console

### Future Enhancements:
1. **Video Processing**
   - Thumbnail auto-generation
   - Multiple quality tiers (480p, 720p, 1080p)
   - Transcoding to web-optimized formats

2. **Enhanced Upload**
   - Chunked uploads for large files
   - Resume capability
   - Upload queue

3. **Analytics**
   - Track views per video
   - Revenue analytics
   - Viewer demographics

4. **Social Features**
   - Comments
   - Likes/reactions
   - Creator follow system

---

## 📚 Additional Resources

- **Arweave Docs:** https://docs.arweave.org/developers/
- **Solana Wallet Adapter:** https://github.com/solana-labs/wallet-adapter
- **JWT Best Practices:** https://jwt.io/introduction

---

## ✅ Summary

You now have a **fully functional authenticated video upload system** with:
- ✅ Wallet-based JWT authentication
- ✅ Protected upload endpoints
- ✅ Dual upload modes (full upload or quick listing)
- ✅ Creator role management
- ✅ Arweave integration (when configured)

The system is ready to use in development mode. Configure Arweave wallet for production-ready permanent video storage!

---

**Questions? Issues?** Check the troubleshooting section or review the code in:
- `src/contexts/AuthContext.tsx`
- `src/pages/CreatorStudio.tsx`
- `server/routes/auth.routes.ts`
- `server/routes/video-upload.routes.ts`


### Appendix B — ARWEAVE_SETUP_GUIDE.md (verbatim)

# Arweave Setup Guide for PayFlix

## What is Arweave?

Arweave is a decentralized storage network that provides **permanent, censorship-resistant file storage**. Perfect for storing videos permanently!

---

## Option 1: Quick Start (Recommended for Development)

For development/testing, you can skip Arweave for now and use **local file storage** or **Supabase storage** instead.

### Update your `.env` file:

```bash
# Set to empty or skip Arweave
ARWEAVE_WALLET_KEY=
ARWEAVE_WALLET_PATH=

# Use local storage for now
VIDEO_STORAGE_PATH=./storage/videos
```

**This allows you to test video uploads without needing an Arweave wallet immediately.**

---

## Option 2: Full Arweave Integration (Production)

If you want permanent decentralized storage with Arweave:

### Step 1: Get an Arweave Wallet

1. **Go to ArConnect (Browser Extension)**
   - Chrome: https://chrome.google.com/webstore/detail/arconnect/einnioafmpimabjcddiinlhmijaionap
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/arconnect/

2. **Install ArConnect and create a new wallet**
   - Follow the setup instructions
   - **SAVE YOUR SEED PHRASE SECURELY!**

3. **Export your wallet JSON**
   - Click ArConnect extension
   - Go to Settings → Wallets
   - Click "Export Keyfile" on your wallet
   - This downloads a JSON file (e.g., `arweave-keyfile.json`)

### Step 2: Fund Your Wallet

Arweave storage costs AR tokens:

1. **Get Test AR (Testnet/Devnet)**
   - Arweave doesn't have a testnet, but uploads are very cheap
   - Use the faucet: https://faucet.arweave.net/

2. **Buy AR Tokens (Mainnet)**
   - Buy on exchanges: Binance, KuCoin, Gate.io
   - Send to your Arweave wallet address

**Cost Example:**
- 1 GB permanent storage ≈ 0.007 AR (~$0.50-$2 depending on AR price)
- A 100 MB video costs ≈ 0.0007 AR (~$0.05-$0.20)

### Step 3: Configure PayFlix

1. **Move your Arweave keyfile to your project:**

```bash
mkdir -p /Users/juice/Desktop/flix/Payflix/keys
mv ~/Downloads/arweave-keyfile.json /Users/juice/Desktop/flix/Payflix/keys/
```

2. **Update `.env` file:**

```bash
# Arweave Configuration
ARWEAVE_HOST=arweave.net
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https
ARWEAVE_GATEWAY=https://arweave.net
ARWEAVE_WALLET_PATH=./keys/arweave-keyfile.json
```

3. **Restart your server** - it should now say:
```
✅ Arweave wallet configured
```

---

## Option 3: Alternative Storage Providers

If you don't want to use Arweave, you can use:

1. **Supabase Storage** (Already configured!)
   - Easier to set up
   - Cheaper for development
   - Not permanent/decentralized
   - Good for testing

2. **IPFS (InterPlanetary File System)**
   - Decentralized
   - Cheaper than Arweave
   - Not permanent (requires pinning services)

3. **Cloudflare R2 or AWS S3**
   - Centralized but reliable
   - Pay-as-you-go pricing
   - Easy integration

---

## Which Option Should I Choose?

### For Development/Testing:
**→ Use Option 1 (Skip Arweave) or Supabase Storage**
- Fastest to set up
- No cost
- Good for testing features

### For Production/Real Users:
**→ Use Option 2 (Arweave)**
- Videos stored forever
- Censorship-resistant
- True Web3 experience
- Small one-time cost per upload

---

## Next Steps After Setup

Once you've chosen and configured your storage:

1. The CreatorStudio upload will automatically use your configured storage
2. Test uploading a small video file
3. Verify the video URL is accessible

---

## Troubleshooting

### "No Arweave wallet configured" warning
- This is fine for development
- The app will work with Supabase storage or local files

### "Insufficient AR balance" error
- Your Arweave wallet needs more AR tokens
- Check balance at: https://viewblock.io/arweave
- Use faucet or buy more AR

### Uploads are slow
- Arweave uploads can take time for large files
- Consider implementing chunked uploads
- Show progress bar to users

---

## Questions?

Check Arweave documentation: https://docs.arweave.org/developers/


### Appendix C — SEAMLESS_UPLOAD_COMPLETE.md (verbatim)

# ✅ Seamless Video Upload - COMPLETE!

## 🎉 What's Been Improved

Your video upload process is now **completely seamless** with **zero interrupting alerts**!

---

## ✨ New Upload Experience

### Before (Annoying):
```
1. Click upload button
2. ❌ ALERT: "Please wait for authentication to complete..."
3. Click OK
4. ❌ CONFIRM: "You need to be a creator. Become one?"
5. Click OK
6. Wait for upload...
7. ❌ ALERT: "Video uploaded successfully!"
8. Click OK
9. Manually switch tabs
```

### After (Seamless):
```
1. Click upload button
2. ✅ Progress bar shows: "Authenticating with wallet..." (5%)
3. ✅ Progress bar shows: "Setting up creator account..." (8%)
4. ✅ Progress bar shows: "Uploading video..." (10% → 100%)
5. ✅ Progress bar shows: "Upload complete! 🎉" (100%)
6. ✅ Auto-reset form
7. ✅ Auto-switch to Analytics tab
8. Done! All in one smooth flow!
```

---

## 🚀 Features

### 1. **Silent Authentication**
- Authenticates automatically in the background
- Shows progress: "Authenticating with wallet..."
- No more annoying alerts!

### 2. **Auto Creator Setup**
- Automatically makes you a creator if needed
- Shows progress: "Setting up creator account..."
- Happens seamlessly during upload

### 3. **Visual Progress Tracking**
```
5%  - Authenticating...
8%  - Setting up creator account...
10% - Starting upload...
30% - Uploading to Arweave...
70% - Saving to database...
100% - Complete! 🎉
```

### 4. **Smart Success Handling**
- Shows success message in progress bar (not alert)
- Waits 2 seconds to let you see completion
- Auto-clears form
- Auto-switches to Analytics tab after 1.5 seconds
- Clean, professional flow!

### 5. **Better Error Messages**
- Errors shown in red box above form (not alerts)
- Clear, helpful error messages
- No need to dismiss popups

---

## 📊 Upload Flow Diagram

```
┌─────────────────────────────────────────────┐
│  User fills in Title, Price, Video file    │
│  Clicks "🚀 Upload Video to Arweave"       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Not authenticated? │
         │  ✅ Auto-login      │ (5% progress)
         └──────────┬──────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Not a creator?     │
         │  ✅ Auto-setup      │ (8% progress)
         └──────────┬──────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Upload video file  │ (10-70% progress)
         │  to Arweave/server  │
         └──────────┬──────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Save to database   │ (70-100% progress)
         └──────────┬──────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Show success! 🎉   │ (100% - 2 seconds)
         │  Clear form         │
         │  Switch to Analytics│ (1.5 seconds)
         └─────────────────────┘
```

---

## 💡 Technical Changes

### File Modified: `src/pages/CreatorStudio.tsx`

**Removed:**
- ❌ `alert('Please wait for authentication to complete...')`
- ❌ `window.confirm('You need to be a creator...')`
- ❌ `alert('Video uploaded successfully!')`
- ❌ `alert('Upload failed: ...')`

**Added:**
- ✅ Silent authentication with progress (5%)
- ✅ Auto creator setup with progress (8%)
- ✅ In-UI success messages
- ✅ Auto form reset after success
- ✅ Auto tab switching after success
- ✅ Error messages in red box (not alerts)

---

## 🎯 User Experience Improvements

### Seamless Authentication
```javascript
// Old way (ANNOYING):
if (!token) {
  alert('Please wait...');  // ❌ Interrupts user
  return;
}

// New way (SEAMLESS):
if (!token) {
  setStage('Authenticating with wallet...');  // ✅ Shows progress
  await login();  // Happens in background
  // Continue upload automatically!
}
```

### Smart Creator Setup
```javascript
// Old way (ANNOYING):
if (!user.isCreator) {
  const confirm = window.confirm('Become creator?');  // ❌ Interrupts
  if (!confirm) return;
}

// New way (SEAMLESS):
if (!user.isCreator) {
  setStage('Setting up creator account...');  // ✅ Shows progress
  await becomeCreator();  // Happens automatically
  // Continue upload automatically!
}
```

### Clean Success Flow
```javascript
// Old way (ANNOYING):
alert('Success!');  // ❌ User must click OK
// Form still has data
// Still on upload tab

// New way (SEAMLESS):
setStage('Upload complete! 🎉');  // ✅ Shows in progress bar
await new Promise(resolve => setTimeout(resolve, 2000));  // Let user see
// Auto-clear form
// Auto-switch to Analytics tab
// Smooth!
```

---

## ✅ Testing the New Flow

### Test 1: First Time User (Not Authenticated)
1. Connect wallet for first time
2. Go to Creator Studio → Upload
3. Fill in title, price, select video
4. Click "🚀 Upload Video to Arweave"
5. **Watch:** Progress bar shows authentication (5%)
6. **Watch:** Progress bar shows creator setup (8%)
7. **Watch:** Progress bar shows upload (10-100%)
8. **Watch:** Success message, form clears, switches to Analytics
9. ✅ No alerts! All seamless!

### Test 2: Returning Creator (Already Authenticated)
1. Connect wallet
2. Go to Creator Studio → Upload
3. Fill in details
4. Click upload
5. **Watch:** Skips authentication (already done!)
6. **Watch:** Skips creator setup (already a creator!)
7. **Watch:** Goes straight to upload (10-100%)
8. **Watch:** Success, auto-clear, auto-switch
9. ✅ Super fast!

### Test 3: Quick Listing (No Video File)
1. Connect wallet
2. Fill in title, price, description
3. Don't select a video file
4. Click "📝 Create Video Listing"
5. **Watch:** Quick authentication if needed
6. **Watch:** Fast database save (30-100%)
7. **Watch:** Success, auto-clear, auto-switch
8. ✅ Lightning fast!

---

## 🔥 What Makes It Seamless?

1. **No Blocking Alerts** - Everything happens in the UI
2. **Visual Progress** - Always see what's happening
3. **Auto-Recovery** - Handles auth failures gracefully
4. **Smart Defaults** - Auto-becomes creator if needed
5. **Clean Completion** - Auto-clears and switches tabs
6. **Fast Feedback** - Progress updates in real-time
7. **Error Handling** - Shows errors in-context (not popups)

---

## 📝 Code Changes Summary

### Authentication (lines 65-77)
```typescript
// Handle authentication seamlessly in the background
if (!token || !user) {
  setStage('Authenticating with wallet...');
  setProgress(5);
  await login();
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### Creator Setup (lines 79-91)
```typescript
// Auto-become creator if needed (seamless)
if (user && !user.isCreator) {
  setStage('Setting up creator account...');
  setProgress(8);
  await becomeCreator();
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### Success Handling (lines 127-145)
```typescript
setProgress(100);
setStage('Upload complete! 🎉');

// Show completion for 2 seconds
await new Promise(resolve => setTimeout(resolve, 2000));

// Auto-clear form
setVideoFile(null);
setThumbnailFile(null);
setVideoTitle('');
setVideoDescription('');
setVideoPrice('');
setCategory('');

// Auto-switch to Analytics
setStage(`✅ "${videoTitle}" uploaded successfully!`);
setTimeout(() => {
  setActiveTab('analytics');
}, 1500);
```

---

## 🎊 Result

Your upload process is now:
- ✅ **Seamless** - No interrupting alerts
- ✅ **Fast** - Auto-handles auth and creator setup
- ✅ **Professional** - Clean progress indicators
- ✅ **User-Friendly** - Clear feedback at every step
- ✅ **Polished** - Auto-clears and switches tabs

---

## 🚀 Try It Now!

1. Go to http://localhost:3001
2. Connect wallet
3. Navigate to Creator Studio
4. Upload a video
5. **Enjoy the seamless experience!** 🎉

No more annoying alerts - just a smooth, professional upload flow!


### Appendix D — UPLOAD_SETUP_GUIDE.md (verbatim)

# 🚀 VIDEO UPLOAD SETUP GUIDE

## 📋 Table of Contents
1. [R2 CORS Configuration](#r2-cors-configuration)
2. [Environment Variables](#environment-variables)
3. [Switching to New Upload System](#switching-to-new-upload-system)
4. [Testing Plan](#testing-plan)
5. [Troubleshooting](#troubleshooting)

---

## 1. R2 CORS Configuration

### Why CORS is Needed
CORS (Cross-Origin Resource Sharing) allows your frontend (localhost:3000) to upload files to Cloudflare R2. Without it, browser security will block uploads.

### How to Configure CORS in Cloudflare R2

1. **Login to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Navigate to R2 → Your Bucket (`payflix-videos`)

2. **Set CORS Rules**
   - Click on your bucket
   - Go to **Settings** → **CORS Policy**
   - Add the following configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5001",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

3. **Save the CORS configuration**

### Alternative: Use Cloudflare R2 Console

If CORS UI is not available, you can use the Cloudflare API or Wrangler CLI:

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Create cors-policy.json with the JSON above

# Apply CORS
wrangler r2 bucket cors set payflix-videos --file cors-policy.json
```

---

## 2. Environment Variables

### Required R2 Configuration

Your `.env` file should have these R2 variables:

```bash
# Cloudflare R2 Configuration
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=payflix-videos
R2_PUBLIC_URL=https://<account-id>.r2.cloudflarestorage.com
```

### Understanding R2 Endpoints

**Correct Format:**
```
https://3ade748d9b665e7d3ecbfd91bf46272c.r2.cloudflarestorage.com
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Your account ID
```

**Wrong Formats (Don't use):**
- ❌ `https://r2.cloudflarestorage.com` (missing account ID)
- ❌ `https://payflix-videos.r2.cloudflarestorage.com` (bucket name in subdomain - this is for custom domains only)
- ❌ `https://cloudflare.com/r2` (completely wrong)

### How to Find Your Account ID

1. Go to Cloudflare Dashboard → R2
2. Click on your bucket
3. Look at the S3 API endpoint - it will show your account ID
4. Or check the endpoint when you create R2 API tokens

### Custom Domain (Optional but Recommended for Production)

Instead of the default endpoint, you can set up a custom domain:

```bash
# .env
R2_PUBLIC_URL=https://cdn.your-domain.com
```

Then in Cloudflare:
1. R2 → Your Bucket → Settings → Public Access
2. Add a custom domain
3. Configure DNS (Cloudflare will guide you)

---

## 3. Switching to New Upload System

### Step 1: Update server/index.ts

Replace the old upload route with the new one:

```typescript
// OLD (comment out or remove)
// import videoUploadRoutes from './routes/video-upload.routes';

// NEW
import videoUploadRoutesV2 from './routes/video-upload-v2.routes';

// Use the new route
app.use('/api/upload', videoUploadRoutesV2);
```

### Step 2: Restart the server

```bash
# Kill the current server (Ctrl+C)
# Restart
npm run dev
```

### Step 3: Verify the server starts without errors

Look for this in the console:
```
✅ Cloudflare R2 storage initialized
   Bucket: payflix-videos
   Endpoint: https://3ade748d9b665e7d3ecbfd91bf46272c.r2.cloudflarestorage.com
```

---

## 4. Testing Plan

### Pre-Upload Checklist

Before testing uploads, verify:

- [ ] **Database is clean**
  ```sql
  -- Run in Supabase SQL Editor
  SELECT id, wallet_address FROM users;
  -- Should show NO UUID-format IDs (no dashes like "ce53010f-6473...")
  ```

- [ ] **localStorage is cleared**
  ```javascript
  // Run in browser console
  localStorage.clear()
  ```

- [ ] **R2 credentials are correct**
  ```bash
  # Test R2 connection (optional)
  curl -X HEAD \
    -H "Authorization: AWS4-HMAC-SHA256 ..." \
    https://3ade748d9b665e7d3ecbfd91bf46272c.r2.cloudflarestorage.com/payflix-videos/
  ```

- [ ] **FFmpeg is installed**
  ```bash
  ffmpeg -version
  # Should show version 8.0 or higher
  ```

### Test Cases

#### Test 1: Small Video Upload (Success)
1. Prepare a **small test video** (< 10MB, MP4 format)
2. Connect your wallet
3. Fill in:
   - Title: "Test Upload"
   - Price: "0.99"
   - Description: "Testing upload system"
4. Select the video file
5. Click "Upload to The Flix"

**Expected Result:**
- Progress bar shows: "Uploading to The Flix..." → 10%
- Server logs show all 6 steps completing
- Final progress: 100% "✅ Upload complete!"
- No errors in browser console or server logs

**If it fails**, check server logs for which step failed:
- Step 1: Validation issue
- Step 2: Database user issue (still UUID format)
- Step 3: FFmpeg issue
- Step 4: R2 upload issue (check CORS, credentials)
- Step 5: Database insert issue

#### Test 2: Large Video Upload (500MB)
1. Use a larger video file
2. Monitor upload progress
3. Should complete without timeout

#### Test 3: Invalid File (Error Handling)
1. Try uploading a .txt file
2. Should show error: "Invalid file type. Only video files are allowed."

#### Test 4: Missing Fields (Validation)
1. Try uploading without title
2. Should show error: "Missing required fields"

#### Test 5: .MOV File (Format Support)
1. Upload a .MOV file (QuickTime)
2. Should work (FFmpeg supports it)

### Monitoring Upload Progress

**Watch server logs:**
```
🎬 ========== VIDEO UPLOAD STARTED ==========
✓ Step 1: Validating request...
✓ Step 2: Verifying user in database...
✓ Step 3: Processing video with FFmpeg...
✓ Step 4: Uploading to Cloudflare R2...
✓ Step 5: Creating database record...
✓ Step 6: Cleaning up temporary files...
✅ ========== UPLOAD SUCCESSFUL (15.3s) ==========
```

**Check browser Network tab:**
- Request to `/api/upload/video` should show Status: 201
- Response should have `success: true`

---

## 5. Troubleshooting

### Error: "User not found in database"

**Cause:** You still have a UUID-format user ID

**Fix:**
1. Run this in Supabase SQL Editor:
```sql
DELETE FROM users WHERE id LIKE '%-%';
```
2. Clear localStorage:
```javascript
localStorage.clear()
```
3. Refresh and reconnect wallet

---

### Error: "Cloud storage upload failed"

**Possible Causes:**
1. **Wrong R2 credentials**
   - Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`
   - Check they haven't expired

2. **Wrong endpoint**
   - Must be: `https://<account-id>.r2.cloudflarestorage.com`
   - Not: `https://r2.cloudflarestorage.com`

3. **Bucket doesn't exist**
   - Check bucket name is exactly `payflix-videos`
   - Bucket must exist in your R2 dashboard

4. **No bucket permissions**
   - R2 API token must have permissions to:
     - PutObject
     - GetObject
     - ListBucket

**How to test R2 connection:**
```typescript
// Add this test endpoint to server/index.ts
app.get('/api/test-r2', async (req, res) => {
  try {
    const exists = await r2StorageService.fileExists('test.txt');
    res.json({ r2Connected: true, testResult: exists });
  } catch (error: any) {
    res.status(500).json({ r2Connected: false, error: error.message });
  }
});
```

---

### Error: "FFmpeg processing failed"

**Possible Causes:**
1. **FFmpeg not installed**
   ```bash
   # Install on Mac:
   brew install ffmpeg

   # Install on Ubuntu:
   sudo apt-get install ffmpeg

   # Install on Windows:
   # Download from https://ffmpeg.org/download.html
   ```

2. **Corrupted video file**
   - Try a different video
   - Ensure file is valid MP4/MOV/WEBM

3. **FFmpeg timeout**
   - Large files take longer
   - Default timeout is 60 seconds
   - Can increase in `video-processor-v2.service.ts`

---

### Error: "Database error" (Code 23503)

**Cause:** Foreign key constraint violation (creator_id references non-existent user)

**Fix:** This means the user ID is still UUID format. Follow the "User not found" fix above.

---

### Upload Stuck at 10%

**Possible Causes:**
1. **Network timeout** - Check internet connection
2. **Server crashed** - Check server logs for errors
3. **Large file** - May take time, be patient
4. **R2 upload hanging** - Restart server

**Debug:**
- Check server logs for the last completed step
- Check browser Network tab - is request still pending?
- Try a smaller file first

---

## 6. Production Checklist

Before deploying to production:

- [ ] Use custom domain for R2 (not the default endpoint)
- [ ] Enable HTTPS for custom domain
- [ ] Set up CDN caching for videos
- [ ] Configure bucket lifecycle rules (delete old temp files)
- [ ] Set up monitoring/alerts for failed uploads
- [ ] Add upload size limits per user tier
- [ ] Implement upload quotas
- [ ] Add video transcoding (different resolutions)
- [ ] Set up backup/redundancy

---

## Need Help?

If uploads still fail after following this guide:

1. **Check server logs** - They now show detailed step-by-step progress
2. **Check error response** - Frontend will show which step failed
3. **Run test endpoint** - Try the `/api/test-r2` endpoint
4. **Verify all prerequisites** - Database clean, localStorage clear, R2 configured

The new upload system provides detailed error messages at each step, making it much easier to diagnose issues!


### Appendix E — WEB3_VIDEO_ARCHIVING_GUIDE.md (verbatim)

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

