# Flix Quick Start Guide

Get Flix running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- A code editor

## Installation

```bash
# 1. Clone and navigate
cd Payflix

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Start development servers
npm run dev
```

This will start:
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000

## First Steps

### 1. Open the app
Navigate to http://localhost:3000

### 2. Connect your wallet
Click "Connect Wallet" in the top right

> **Note**: In development mode, a mock wallet is generated automatically. In production, this would connect to Phantom/Solflare.

### 3. Browse videos
You'll see 3 sample videos on the home page

### 4. Try the x402 payment flow
1. Click on any video
2. You'll see the payment screen (HTTP 402)
3. Click "Pay X USDC & Watch"
4. Watch the console for payment processing
5. Video unlocks instantly!

### 5. Become a creator
1. Click "Become Creator" in the navbar
2. Go to "Creator Studio"
3. Upload your first video
4. Set a price in USDC

## Testing the Payment Flow

### Scenario 1: Watch a Video (User)

```bash
# 1. Open browser console (F12)
# 2. Navigate to a video
# 3. Click pay button
# 4. Watch the x402 payment flow in console:

=== X402 Payment Flow ===
1. Creating USDC transfer transaction...
   Amount: 2.99 USDC
   To: CreatorWalletAddress...
2. Transaction signed and submitted
   Signature: 5KE7F...
3. Verifying payment with AI Agent...
4. Payment verified!
   Creator receives: 2.92 USDC
   Platform receives: 0.07 USDC
=== Payment Complete ===
```

### Scenario 2: Upload a Video (Creator)

```bash
# 1. Connect wallet
# 2. Click "Become Creator"
# 3. Navigate to Creator Studio
# 4. Click "Upload Video"
# 5. Fill in:
#    - Title: "My Awesome Video"
#    - Description: "Learn something cool"
#    - Price: 4.99 USDC
# 6. Click "Upload Video"
# 7. Video appears in your dashboard
```

## Understanding the Console Output

When you start the server, you'll see:

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║                  🎬 FLIX VIDEO PLATFORM                    ║
║              X402 Payment Protocol on Solana               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

🚀 Server running on port 5000
🌐 API: http://localhost:5000/api
💳 Protocol: X402 with USDC on Solana
🤖 AI Agent: Enabled for payment verification
💰 Revenue Split: 97.65% Creator / 2.35% Platform

📋 Features:
   ✓ Instant creator monetization
   ✓ No ads for users
   ✓ Instant payments via x402
   ✓ AI-powered payment verification
   ✓ Automatic revenue splitting
```

## API Testing with curl

### Get all videos
```bash
curl http://localhost:5000/api/videos
```

### Get video details
```bash
curl http://localhost:5000/api/videos/video_1
```

### Try to stream (will get 402)
```bash
curl -H "x-wallet-address: YourWallet123" \
     http://localhost:5000/api/videos/video_1/stream
```

Response:
```json
{
  "error": "Payment Required",
  "protocol": "x402",
  "challenge": {
    "videoId": "video_1",
    "price": {
      "amount": 2.99,
      "currency": "USDC",
      "network": "Solana"
    },
    "split": {
      "creator": 97.65,
      "platform": 2.35
    }
  }
}
```

### Connect wallet
```bash
curl -X POST http://localhost:5000/api/users/connect-wallet \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "YourSolanaWallet123", "username": "TestUser"}'
```

### Upload video (as creator)
```bash
curl -X POST http://localhost:5000/api/videos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Video",
    "description": "A test video",
    "priceUsdc": 1.99,
    "creatorWallet": "CreatorWallet123"
  }'
```

## Project Structure

```
Payflix/
├── server/                  # Backend
│   ├── config/             # Configuration
│   ├── database/           # In-memory DB
│   ├── middleware/         # x402 middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   │   ├── ai-agent.service.ts    # Payment verification
│   │   └── solana.service.ts      # Blockchain interaction
│   ├── types/              # TypeScript types
│   └── index.ts            # Server entry
│
├── src/                    # Frontend
│   ├── components/         # React components
│   │   ├── Navbar.tsx
│   │   └── VideoCard.tsx
│   ├── contexts/           # React contexts
│   │   └── WalletContext.tsx
│   ├── pages/              # Page components
│   │   ├── Home.tsx
│   │   ├── VideoPlayer.tsx    # x402 payment flow
│   │   ├── Profile.tsx
│   │   └── CreatorDashboard.tsx
│   ├── App.tsx             # Main app
│   ├── main.tsx            # Entry point
│   └── index.css           # Styles
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── README.md               # Full documentation
├── ARCHITECTURE.md         # System architecture
└── QUICKSTART.md          # This file
```

## Key Features Demonstrated

### 1. X402 Protocol
- HTTP 402 responses with payment challenges
- Instant payment flow without popups
- Blockchain verification

### 2. AI Agent
- Automatic payment verification
- Revenue split calculation (97.65% / 2.35%)
- Fraud detection

### 3. Solana Integration
- USDC token transfers
- Transaction verification
- Wallet management

### 4. User Experience
- One-time wallet connection
- No ads
- Instant video unlock
- Personal library

### 5. Creator Features
- Easy video upload
- Instant monetization
- Real-time analytics
- 97.65% revenue share

## Next Steps

### For Development
1. Replace in-memory database with PostgreSQL
2. Implement real Solana wallet integration
3. Add video transcoding and storage
4. Implement HLS streaming
5. Add user authentication (JWT)

### For Production
1. Deploy to cloud (AWS, GCP, Vercel)
2. Set up Solana mainnet-beta
3. Configure production USDC mint
4. Add CDN for video delivery
5. Implement proper video encoding

### Integrations
- **PayAI Network**: Enhanced payment processing
- **Phantom Wallet**: Real wallet integration
- **IPFS/Arweave**: Decentralized video storage
- **Livepeer**: Video transcoding

## Troubleshooting

### Port already in use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm run dev:server
```

### Dependencies fail to install
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Frontend can't connect to backend
Check that:
- Backend is running on port 5000
- Vite proxy is configured (vite.config.ts)
- No CORS errors in console

## Learn More

- [Full README](./README.md) - Complete documentation
- [Architecture Guide](./ARCHITECTURE.md) - System design
- [PayAI Network](https://payai.network/) - Payment integration

## Support

Need help? Check:
- Console logs (browser F12)
- Server logs (terminal)
- GitHub issues

---

**Happy building with Flix! 🎬**
