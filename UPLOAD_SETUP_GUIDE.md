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
