# Supabase Setup Guide for PayFlix

This guide will walk you through setting up Supabase for your PayFlix platform.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email

## Step 2: Create a New Project

1. Click "New Project"
2. Fill in:
   - **Project Name**: `payflix` (or your choice)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
3. Click "Create new project"
4. Wait 2-3 minutes for project provisioning

## Step 3: Get Your Credentials

1. Once your project is ready, go to **Settings** (gear icon)
2. Click **API** in the left sidebar
3. Copy these two values:
   - **Project URL** (starts with `https://...supabase.co`)
   - **anon public** key (long string)

## Step 4: Add Credentials to PayFlix

1. Open your `.env` file in the PayFlix root directory
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

3. Save the file
4. Restart your dev server:
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Step 5: Create Database Tables

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste this SQL:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  bio TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  price_usdc DECIMAL(10, 2) NOT NULL,
  arweave_tx_id TEXT,
  arweave_url TEXT,
  thumbnail_url TEXT,
  category TEXT,
  tags TEXT[],
  duration INTEGER,
  views INTEGER DEFAULT 0,
  is_promoted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  buyer_wallet TEXT NOT NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_usdc DECIMAL(10, 2) NOT NULL,
  transaction_signature TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_wallet TEXT NOT NULL,
  subscriber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, creator_id)
);

-- Create indexes for better performance
CREATE INDEX idx_videos_creator ON videos(creator_wallet);
CREATE INDEX idx_videos_price ON videos(price_usdc);
CREATE INDEX idx_videos_created ON videos(created_at DESC);
CREATE INDEX idx_purchases_video ON purchases(video_id);
CREATE INDEX idx_purchases_buyer ON purchases(buyer_wallet);
CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_wallet);
CREATE INDEX idx_subscriptions_creator ON subscriptions(creator_wallet);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (anyone can read, only owner can update)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (wallet_address = current_setting('request.jwt.claim.wallet', true));

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claim.wallet', true));

-- RLS Policies for videos (anyone can read, only creator can modify)
CREATE POLICY "Videos are viewable by everyone" ON videos
  FOR SELECT USING (true);

CREATE POLICY "Creators can insert own videos" ON videos
  FOR INSERT WITH CHECK (creator_wallet = current_setting('request.jwt.claim.wallet', true));

CREATE POLICY "Creators can update own videos" ON videos
  FOR UPDATE USING (creator_wallet = current_setting('request.jwt.claim.wallet', true));

CREATE POLICY "Creators can delete own videos" ON videos
  FOR DELETE USING (creator_wallet = current_setting('request.jwt.claim.wallet', true));

-- RLS Policies for purchases (anyone can insert, users can view own purchases)
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (buyer_wallet = current_setting('request.jwt.claim.wallet', true));

CREATE POLICY "Users can insert purchases" ON purchases
  FOR INSERT WITH CHECK (true);

-- RLS Policies for subscriptions
CREATE POLICY "Subscriptions are viewable by everyone" ON subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL USING (subscriber_wallet = current_setting('request.jwt.claim.wallet', true));
```

4. Click **Run** to execute the SQL
5. You should see "Success. No rows returned"

## Step 6: Create Storage Buckets

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Create these buckets (one at a time):
   - Name: `videos`, Public: **Yes**
   - Name: `thumbnails`, Public: **Yes**
   - Name: `profile-images`, Public: **Yes**

## Step 7: Test the Connection

1. Your dev server should now connect to Supabase
2. Try uploading a video in Creator Studio
3. Check your Supabase project's **Table Editor** to see the data

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env` file has the correct values
- Restart the dev server after updating `.env`

### "Failed to fetch"
- Check your internet connection
- Verify your Supabase project URL is correct
- Make sure your Supabase project is not paused (free tier pauses after inactivity)

### "Row Level Security" errors
- Make sure you ran all the RLS policies in Step 5
- For testing, you can temporarily disable RLS in Table Editor settings

## What's Next?

Once Supabase is connected:
- Video uploads will be saved to your database
- Creator analytics will show real data
- Purchase history will be tracked
- User profiles will persist

Need help? Check the [Supabase documentation](https://supabase.com/docs)
