# Flix Platform Architecture

## System Overview

Flix is a decentralized video platform that implements the x402 payment protocol for instant micropayments on Solana.

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React App (TypeScript + Tailwind)                  │   │
│  │  - Home Page (Video Grid)                           │   │
│  │  - Video Player (x402 Payment Flow)                 │   │
│  │  - User Profile & Library                           │   │
│  │  - Creator Dashboard                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↕ HTTP/REST                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Express API Server (Node.js + TypeScript)          │   │
│  │                                                      │   │
│  │  ┌──────────────┐  ┌─────────────────────────┐     │   │
│  │  │   X402       │  │   AI Agent Service      │     │   │
│  │  │ Middleware   │  │ - Payment Verification  │     │   │
│  │  │ - 402 Resp   │  │ - Revenue Split         │     │   │
│  │  │ - Challenges │  │ - Fraud Detection       │     │   │
│  │  └──────────────┘  └─────────────────────────┘     │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │        Solana Service                        │  │   │
│  │  │ - Payment Verification                       │  │   │
│  │  │ - Transaction Monitoring                     │  │   │
│  │  │ - USDC Balance Checks                        │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │    In-Memory Database                        │  │   │
│  │  │ - Users, Videos, Payments, Access            │  │   │
│  │  │ (Replace with PostgreSQL in production)      │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  USDC Token Transfers                               │   │
│  │  - Creator Wallet (97.65%)                          │   │
│  │  - Platform Wallet (2.35%)                          │   │
│  │  - Transaction Verification                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## X402 Payment Protocol Flow

```
USER                    FRONTEND                BACKEND (x402)           AI AGENT            SOLANA
  │                        │                         │                      │                  │
  ├─1. Click Video────────>│                         │                      │                  │
  │                        ├─2. GET /videos/:id/stream>                     │                  │
  │                        │                         │                      │                  │
  │                        │<─3. HTTP 402 ───────────┤                      │                  │
  │                        │    Payment Required     │                      │                  │
  │                        │    + Challenge Data     │                      │                  │
  │                        │                         │                      │                  │
  │<─4. Show Payment UI────┤                         │                      │                  │
  │   (Amount, Recipient)  │                         │                      │                  │
  │                        │                         │                      │                  │
  ├─5. Approve Payment────>│                         │                      │                  │
  │                        │                         │                      │                  │
  │                        ├─6. Send USDC ──────────────────────────────────────────────────────>│
  │                        │    to Creator Wallet    │                      │                  │
  │                        │                         │                      │                  │
  │                        │<─7. Tx Signature ───────────────────────────────────────────────────┤
  │                        │                         │                      │                  │
  │                        ├─8. POST /verify-payment>│                      │                  │
  │                        │    { signature }        │                      │                  │
  │                        │                         │                      │                  │
  │                        │                         ├─9. Verify Payment──>│                  │
  │                        │                         │                      ├─10. Check Tx────>│
  │                        │                         │                      │                  │
  │                        │                         │                      │<─11. Tx Data─────┤
  │                        │                         │                      │                  │
  │                        │                         │                      ├─12. Split $──────>│
  │                        │                         │                      │   97.65% Creator │
  │                        │                         │                      │   2.35% Platform │
  │                        │                         │                      │                  │
  │                        │                         │<─13. Verified────────┤                  │
  │                        │                         ├─14. Grant Access     │                  │
  │                        │                         │                      │                  │
  │                        │<─15. Access Granted ────┤                      │                  │
  │                        │                         │                      │                  │
  │<─16. Stream Video──────┤                         │                      │                  │
  │    ✓ Unlocked          │                         │                      │                  │
```

## Component Breakdown

### Frontend Components

#### 1. Wallet Context (`src/contexts/WalletContext.tsx`)
- Manages wallet connection state
- Handles connect/disconnect
- Stores user information
- Manages creator status

#### 2. Video Card (`src/components/VideoCard.tsx`)
- Displays video thumbnail
- Shows price in USDC
- Indicates if already purchased
- Links to video player

#### 3. Navbar (`src/components/Navbar.tsx`)
- Wallet connection button
- User address display
- "Become Creator" CTA
- Navigation links

#### 4. Pages
- **Home**: Video grid, platform features
- **VideoPlayer**: x402 payment flow, video streaming
- **Profile**: User library, purchase history
- **CreatorDashboard**: Upload videos, track earnings

### Backend Services

#### 1. X402 Middleware (`server/middleware/x402.middleware.ts`)
```typescript
// Generates HTTP 402 challenge
generateX402Challenge(videoId, price, creator)

// Returns 402 response with payment details
send402Response(res, challenge)

// Validates payment proof
validatePaymentProof(proof)
```

#### 2. AI Agent Service (`server/services/ai-agent.service.ts`)
```typescript
// Main verification function
verifyAndSplitPayment(signature, video, userWallet)
  → Verify blockchain transaction
  → Calculate revenue split (97.65% / 2.35%)
  → Return payment record

// Real-time monitoring
monitorPayment(signature, maxAttempts)
  → Poll blockchain for confirmation
  → Return true when verified

// Fraud detection
detectFraud(userWallet, signature)
  → Check suspicious patterns
  → Return fraud score
```

#### 3. Solana Service (`server/services/solana.service.ts`)
```typescript
// Verify payment on blockchain
verifyPayment(signature, expectedAmount, recipient)
  → Fetch transaction from Solana
  → Check token balance changes
  → Validate amount matches

// Split payment between parties
splitPayment(source, creator, amount)
  → Calculate creator amount (97.65%)
  → Calculate platform amount (2.35%)
  → Execute transfer (in production)
```

#### 4. Database (`server/database/index.ts`)
- In-memory storage (development)
- User management
- Video catalog
- Payment records
- Access control

### API Routes

#### Videos (`/api/videos`)
- `GET /` - List all videos
- `GET /:id` - Get video details
- `GET /:id/stream` - Stream video (402 protected)
- `POST /:id/verify-payment` - Verify and unlock
- `POST /` - Upload video

#### Users (`/api/users`)
- `POST /connect-wallet` - One-time wallet setup
- `GET /profile` - User profile and stats
- `POST /become-creator` - Upgrade account
- `GET /purchased-videos` - Library

#### Analytics (`/api/analytics`)
- `GET /platform` - Platform metrics
- `GET /creator/:wallet` - Creator stats

## Data Models

### User
```typescript
{
  id: string
  walletAddress: string
  username?: string
  isCreator: boolean
  createdAt: Date
}
```

### Video
```typescript
{
  id: string
  creatorId: string
  creatorWallet: string
  title: string
  description: string
  priceUsdc: number
  thumbnailUrl: string
  videoUrl: string
  duration: number
  views: number
  earnings: number
  createdAt: Date
  updatedAt: Date
}
```

### Payment
```typescript
{
  id: string
  videoId: string
  userId: string
  userWallet: string
  creatorWallet: string
  amount: number
  creatorAmount: number     // 97.65%
  platformAmount: number    // 2.35%
  transactionSignature: string
  status: 'pending' | 'verified' | 'failed'
  verifiedAt?: Date
  createdAt: Date
}
```

### VideoAccess
```typescript
{
  userId: string
  videoId: string
  paymentId: string
  expiresAt: Date
}
```

## Security Considerations

### 1. Payment Verification
- All transactions verified on Solana blockchain
- No trust in user-submitted data
- Transaction signatures validated
- Amount matching enforced

### 2. Access Control
- Video streaming requires verified payment
- Access tokens expire (configurable)
- User-video mapping in database

### 3. Fraud Prevention
- AI Agent monitors payment patterns
- Duplicate transaction detection
- Rate limiting on payment attempts
- Wallet address validation

### 4. Wallet Security
- No private keys stored on backend
- Platform wallet secured via environment
- User signatures required for payments

## Scalability

### Current (MVP)
- In-memory database
- Single server instance
- Development Solana RPC

### Production Recommendations
- **Database**: PostgreSQL or MongoDB
- **Caching**: Redis for video access tokens
- **CDN**: CloudFlare for video delivery
- **Load Balancer**: Multiple backend instances
- **RPC**: Dedicated Solana RPC node
- **Storage**: IPFS or S3 for videos
- **Streaming**: HLS/DASH with adaptive bitrate

## Integration Points

### PayAI Network
Future integration for enhanced payment processing:
```typescript
// Enhanced payment with PayAI
const payment = await payai.createPayment({
  amount: video.priceUsdc,
  token: 'USDC',
  recipient: video.creatorWallet,
  split: [
    { address: creatorWallet, percentage: 97.65 },
    { address: platformWallet, percentage: 2.35 }
  ]
});
```

### Wallet Providers
- Phantom
- Solflare
- Backpack
- Glow

### Video Infrastructure
- Transcoding: FFmpeg, AWS MediaConvert
- Storage: IPFS, Arweave, S3
- Streaming: HLS.js, Video.js

## Deployment Architecture

```
                    ┌─────────────┐
                    │   CloudFlare │
                    │     CDN      │
                    └──────┬───────┘
                           │
              ┌────────────┴─────────────┐
              │                          │
         ┌────▼─────┐            ┌──────▼──────┐
         │  Frontend │            │   Backend   │
         │  (Static) │            │  (Node.js)  │
         │   Vite    │            │   Express   │
         └───────────┘            └──────┬──────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                    ┌─────▼──────┐ ┌────▼────┐  ┌─────▼──────┐
                    │ PostgreSQL │ │  Redis  │  │   Solana   │
                    │  Database  │ │  Cache  │  │ Mainnet-β  │
                    └────────────┘ └─────────┘  └────────────┘
```

---

This architecture enables:
- ✅ Instant payments via x402
- ✅ 97.65% creator revenue
- ✅ No ads, no subscriptions
- ✅ Blockchain-verified payments
- ✅ Scalable and secure
