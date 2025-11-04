# CRITICAL: Environment Variable Fix

## Problem
Your shell had `SUPABASE_SERVICE_KEY` set to the ANON key, which was overriding the .env file.

## Solution
You need to PERMANENTLY remove this from your shell environment.

### Check which shell you're using:
```bash
echo $SHELL
```

### If using zsh (most common on Mac):
Edit `~/.zshrc` and remove any line that sets `SUPABASE_SERVICE_KEY`

Then run:
```bash
source ~/.zshrc
```

### If using bash:
Edit `~/.bashrc` or `~/.bash_profile` and remove any line that sets `SUPABASE_SERVICE_KEY`

Then run:
```bash
source ~/.bashrc  # or source ~/.bash_profile
```

### Verify it's unset:
```bash
echo $SUPABASE_SERVICE_KEY
```
Should print nothing (blank line)

### Then restart your development server:
```bash
npm run dev
```

## What Was Fixed

1. ✅ Created RLS policy to allow service_role to delete videos
2. ✅ Fixed .env to use correct service_role key
3. ✅ Updated deleteVideo() to handle cascade deletions (payments + video_access + video)
4. ✅ Fixed foreign key constraint issues

## Testing
Upload a new video and try deleting it - it should now delete completely from:
- Database (videos table)
- Related payments
- Related video_access records
- UI (disappears immediately)
