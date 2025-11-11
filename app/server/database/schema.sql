-- Flix Platform Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    username VARCHAR(50),
    email VARCHAR(255),
    is_creator BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for wallet lookups
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creator_wallet VARCHAR(44) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_usdc DECIMAL(10, 6) NOT NULL,
    thumbnail_url TEXT,
    video_url TEXT,
    video_path TEXT,
    duration INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    earnings DECIMAL(10, 6) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, processing, deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for video queries
CREATE INDEX idx_videos_creator ON videos(creator_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_videos_status ON videos(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_wallet VARCHAR(44) NOT NULL,
    creator_wallet VARCHAR(44) NOT NULL,
    amount DECIMAL(10, 6) NOT NULL,
    creator_amount DECIMAL(10, 6) NOT NULL,
    platform_amount DECIMAL(10, 6) NOT NULL,
    transaction_signature VARCHAR(88) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, failed
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for payment queries
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_video ON payments(video_id);
CREATE INDEX idx_payments_signature ON payments(transaction_signature);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Video access table
CREATE TABLE IF NOT EXISTS video_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id)
);

-- Indexes for access checks
CREATE INDEX idx_video_access_user ON video_access(user_id);
CREATE INDEX idx_video_access_video ON video_access(video_id);
CREATE INDEX idx_video_access_expires ON video_access(expires_at);

-- Sessions table for JWT refresh tokens
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development (optional)
INSERT INTO users (wallet_address, username, is_creator) VALUES
    ('CreatorWalletAddress1234567890123456789', 'TechCreator', TRUE),
    ('ViewerWalletAddress1234567890123456789', 'VideoFan', FALSE)
ON CONFLICT (wallet_address) DO NOTHING;
