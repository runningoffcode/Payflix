# 🎬 Flix - X402 Video Platform

**Instant Video Monetization on Solana**

Flix is a revolutionary video platform that uses the **x402 payment protocol** to enable instant, seamless payments for video content. Built on Solana with USDC, it provides creators with instant monetization (97.65% revenue share) and users with an ad-free viewing experience.

## 🌟 Key Features

### For Users
- ⚡ **Instant Payments** - Pay per video using USDC on Solana via x402 protocol
- 🚫 **No Ads** - Pure viewing experience without interruptions
- 💳 **No Popups** - Seamless payment flow, just click and watch
- 🔒 **Instant Access** - Video unlocks immediately after payment verification
- 📚 **Personal Library** - Access purchased videos anytime

### For Creators
- 💰 **97.65% Revenue Share** - Keep almost all of your earnings
- ⚡ **Instant Payouts** - Get paid immediately in USDC
- 🤖 **AI-Powered Verification** - Automated payment processing
- 📊 **Creator Dashboard** - Track earnings, views, and analytics
- 🎥 **Easy Upload** - Simple video upload and pricing

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Node.js + Express + TypeScript
- Solana Web3.js for blockchain integration
- X402 protocol middleware for payment handling
- AI Agent service for payment verification

**Frontend:**
- React + TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Solana wallet integration

**Blockchain:**
- Solana blockchain
- USDC (SPL Token) for payments
- x402 payment protocol

## 🔄 X402 Payment Flow

```
1. User clicks on video
   ↓
2. Server responds with HTTP 402 Payment Required
   + Payment challenge with USDC price
   ↓
3. User wallet sends USDC to creator's address
   (Instant, no popup)
   ↓
4. AI Agent verifies payment on Solana blockchain
   ↓
5. AI Agent splits revenue:
   - 97.65% → Creator
   - 2.35% → Platform
   ↓
6. Video unlocks immediately
   ✓ User can watch
```

### HTTP 402 Response Example

```json
{
  "error": "Payment Required",
  "protocol": "x402",
  "version": "1.0",
  "challenge": {
    "videoId": "video_123",
    "price": {
      "amount": 2.99,
      "currency": "USDC",
      "network": "Solana",
      "decimals": 6
    },
    "recipient": {
      "creator": "CreatorWalletAddress...",
      "platform": "PlatformWalletAddress..."
    },
    "split": {
      "creator": 97.65,
      "platform": 2.35
    }
  }
}
```

## 🤖 AI Agent

The AI Agent is a core component that:
1. **Monitors** Solana blockchain for incoming payments
2. **Verifies** transaction signatures and amounts
3. **Validates** payment matches video price
4. **Splits** revenue automatically (97.65% / 2.35%)
5. **Detects** fraud patterns
6. **Grants** video access instantly

See implementation: `server/services/ai-agent.service.ts`

## 💳 Payment Integration with PayAI

Flix can integrate with [PayAI Network](https://payai.network/) for enhanced Solana payment processing:

```typescript
// Future integration example
import { PayAI } from '@payai/sdk';

const payai = new PayAI({
  network: 'mainnet-beta',
  apiKey: process.env.PAYAI_API_KEY,
});

// Process payment through PayAI
const payment = await payai.processPayment({
  amount: video.priceUsdc,
  currency: 'USDC',
  recipient: video.creatorWallet,
  metadata: {
    videoId: video.id,
    platform: 'Flix',
  },
});
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Solana wallet (Phantom, Solflare, etc.)
- USDC on Solana (Devnet for testing)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/payflix.git
cd payflix
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development servers**
```bash
npm run dev
```

This will start:
- Backend server: `http://localhost:5000`
- Frontend app: `http://localhost:3000`

### Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
PLATFORM_WALLET_PRIVATE_KEY=your_private_key

# USDC Token Address (Devnet)
USDC_MINT_ADDRESS=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Platform Fee Configuration
PLATFORM_FEE_PERCENTAGE=2.35
CREATOR_FEE_PERCENTAGE=97.65

# AI Agent Configuration
AI_AGENT_ENABLED=true
AI_VERIFICATION_THRESHOLD=0.95
```

## 📡 API Endpoints

### Videos
- `GET /api/videos` - List all videos
- `GET /api/videos/:id` - Get video details
- `GET /api/videos/:id/stream` - Stream video (returns 402 if not paid)
- `POST /api/videos/:id/verify-payment` - Verify payment and unlock
- `POST /api/videos` - Upload new video (creators only)

### Users
- `POST /api/users/connect-wallet` - Connect wallet (one-time)
- `GET /api/users/profile` - Get user profile
- `POST /api/users/become-creator` - Upgrade to creator account
- `GET /api/users/purchased-videos` - Get purchased videos

### Analytics
- `GET /api/analytics/platform` - Platform-wide statistics
- `GET /api/analytics/creator/:wallet` - Creator analytics

## 🎨 Frontend Pages

### Home (`/`)
- Browse all available videos
- View video cards with price and info
- Connect wallet to start watching

### Video Player (`/video/:id`)
- Watch video (if purchased)
- x402 payment flow (if not purchased)
- Instant unlock after payment

### Profile (`/profile`)
- View purchased videos
- Track spending
- Access personal library

### Creator Dashboard (`/creator`)
- Upload new videos
- Track earnings and views
- Manage video pricing
- View analytics

## 💡 How It Works

### 1. User Connects Wallet (One-Time)
```typescript
// Frontend: src/contexts/WalletContext.tsx
const connectWallet = async () => {
  // Connect to Solana wallet (Phantom/Solflare)
  const wallet = await window.solana.connect();

  // Register with backend
  await fetch('/api/users/connect-wallet', {
    method: 'POST',
    body: JSON.stringify({ walletAddress: wallet.publicKey })
  });
};
```

### 2. User Requests Video
```typescript
// Frontend tries to access video
const response = await fetch(`/api/videos/${id}/stream`, {
  headers: { 'x-wallet-address': userWallet }
});

if (response.status === 402) {
  // HTTP 402 Payment Required
  const challenge = await response.json();
  // Show payment UI
}
```

### 3. Payment Sent
```typescript
// User sends USDC to creator
const transaction = await sendUSDC({
  to: challenge.recipient.creator,
  amount: challenge.price.amount,
});

// Submit signature for verification
await fetch(`/api/videos/${id}/verify-payment`, {
  method: 'POST',
  body: JSON.stringify({
    transactionSignature: transaction.signature,
    userWallet,
  }),
});
```

### 4. AI Agent Verifies
```typescript
// Backend: server/services/ai-agent.service.ts
const verified = await solanaService.verifyPayment(
  signature,
  expectedAmount,
  recipientAddress
);

const split = await solanaService.splitPayment(
  userWallet,
  creatorWallet,
  totalAmount
);
// Creator: 97.65%
// Platform: 2.35%
```

### 5. Video Unlocks
```typescript
// Grant access
await db.grantVideoAccess({
  userId,
  videoId,
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
});

// User can now watch
```

## 📊 Revenue Split

Every payment is automatically split by the AI Agent:

- **97.65%** → Creator (instant payout in USDC)
- **2.35%** → Platform (operational costs)

Example: Video costs 10 USDC
- Creator receives: **9.765 USDC**
- Platform receives: **0.235 USDC**

## 🔐 Security

- All payments verified on Solana blockchain
- Transaction signatures validated
- Fraud detection via AI Agent
- No private keys stored on server
- Wallet signatures required for actions

## 🌐 Production Deployment

### Backend
```bash
npm run build:server
npm start
```

### Frontend
```bash
npm run build:client
# Serve dist/client with nginx or similar
```

### Environment
- Use Solana mainnet-beta
- Configure production RPC URL
- Set up proper USDC mint address
- Secure platform wallet private key

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file

## 🔗 Links

- [PayAI Network](https://payai.network/) - Solana payment facilitator
- [Solana Docs](https://docs.solana.com/)
- [USDC on Solana](https://www.circle.com/en/usdc)

## 💬 Support

For questions or support:
- Open an issue on GitHub
- Join our Discord community
- Email: support@flix.example

---

**Built with ❤️ using x402 protocol on Solana**
- `DIGITAL_ID_DEV_MOCK=true` – optional; set only on staging/dev to show synthetic “Verified” payouts in the Digital ID badge when the environment has no real verified payments. Keep unset or false on production (payflix.fun).
