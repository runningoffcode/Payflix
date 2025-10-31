# X402 Session Keys Setup Guide

## Overview

PayFlix now uses **X402 Session Keys** for seamless payments! This means:

- **ONE popup** when connecting wallet (to create a session)
- **ZERO popups** for 24 hours after that
- **User funds only** - Platform never fronts money
- **True Netflix-level UX** - Click and watch instantly

## What Was Implemented

### Backend

1. **Session Management System** (`server/services/session.service.ts`)
   - Generates temporary keypairs for users
   - Encrypts and stores session keys securely (AES-256-GCM)
   - Manages session lifecycle (creation, confirmation, expiration)

2. **Session-Based Payment Service** (`server/services/session-payment.service.ts`)
   - Processes payments using delegated session keys
   - Transfers USDC directly from user's wallet (not platform's!)
   - Automatic 97.65% / 2.35% revenue split

3. **Session API Routes** (`server/routes/sessions.routes.ts`)
   - `POST /api/sessions/create` - Create new session
   - `POST /api/sessions/confirm` - Confirm session after user approval
   - `GET /api/sessions/active` - Check for active session
   - `POST /api/sessions/revoke` - Revoke a session

4. **User Profile API Routes** (`server/routes/user-profile.routes.ts`)
   - `GET /api/users/profile` - Get user profile by wallet
   - `PUT /api/users/profile` - Update username, profile picture

5. **Updated Payment Routes** (`server/routes/payments.routes.ts`)
   - Now uses `sessionPaymentService` instead of custodial facilitator
   - Checks for active session before processing payment
   - Returns 402 error if no session exists

### Frontend

1. **SessionCreationModal** (`src/components/SessionCreationModal.tsx`)
   - Beautiful modal that prompts users to create a session
   - Shows benefits of seamless payments
   - Allows users to set spending limit (default $50)
   - Guides user through approval process

2. **SessionManager** (`src/components/SessionManager.tsx`)
   - Monitors wallet connection status
   - Automatically checks for active session
   - Shows modal if no session exists
   - Handles session lifecycle

3. **Updated Account Page** (`src/pages/Account.tsx`)
   - Now uses backend API for profile storage
   - Persists username and profile picture across wallet connections
   - No more localStorage - everything synced with database

### Database

1. **Sessions Table** (see `ADD_SESSIONS_TABLE.sql`)
   - Stores encrypted session keys
   - Tracks approved amount, spent amount, remaining balance
   - Automatic expiration after 24 hours
   - Row Level Security (RLS) policies

## Setup Instructions

### 1. Run the Database Migration

**IMPORTANT:** You must run the SQL migration to create the sessions table.

#### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `ADD_SESSIONS_TABLE.sql`
5. Paste into the SQL Editor
6. Click **Run**

#### Option B: Command Line

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" < ADD_SESSIONS_TABLE.sql
```

### 2. Verify Environment Variables

Make sure your `.env` file has the session encryption key:

```env
# Session Keys Encryption (for X402 seamless payments)
SESSION_ENCRYPTION_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

**IMPORTANT:** In production, generate a secure random key:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Restart the Server

```bash
npm run dev
```

You should see the server start with session payment service initialized:

```
💳 Session Payment Service initialized
   Platform fee wallet: 81qpJ8kP4kb1Vf7kgubyEUcJ726dHEEqpFRP4wTFsr1o
```

## How It Works

### User Flow

1. **User connects wallet** → SessionManager detects connection
2. **SessionManager checks for active session** → Calls `GET /api/sessions/active`
3. **If no session:**
   - SessionCreationModal appears
   - User sets spending limit (e.g., $50 USDC)
   - User approves SPL token delegation (ONE popup)
   - Session created and stored in database
4. **User watches videos:**
   - Click on video → Payment processed via session key
   - **ZERO popups** - Completely seamless!
   - Session key signs on user's behalf
   - Funds transferred from user's wallet directly to creator

### Technical Flow

```
User's USDC Account
    ↓ (delegated authority via approve instruction)
Session Keypair
    ↓ (signs transfers on user's behalf)
Creator's Account (97.65%) + Platform Account (2.35%)
```

### Session Lifecycle

- **Created:** User approves token delegation
- **Active:** Used for seamless payments
- **Expired:** After 24 hours (automatic)
- **Revoked:** User can manually revoke

## Testing

### 1. Test Session Creation

1. Connect wallet (Phantom/Solflare)
2. Modal should appear prompting session creation
3. Set spending limit (e.g., $10 for testing)
4. Approve transaction in wallet
5. Check browser console for success message

### 2. Test Seamless Payment

1. After session created, click on any video
2. Payment should process WITHOUT wallet popup
3. Video should start playing immediately
4. Check transaction on Solana Explorer

### 3. Test Profile Persistence

1. Go to Account page → Edit username
2. Disconnect wallet
3. Reconnect wallet
4. Username should persist (loaded from database)

### 4. API Testing with curl

#### Check Session Balance
```bash
curl "http://localhost:5001/api/payments/session/balance?userWallet=J3WmMHUixgfcUtL5ov4Cn6LE65cDybgAg7mc1PWGyVY"
```

#### Get User Profile
```bash
curl "http://localhost:5001/api/users/profile?walletAddress=J3WmMHUixgfcUtL5ov4Cn6LE65cDybgAg7mc1PWGyVY"
```

## Security Notes

### Encryption

- Session private keys are encrypted using **AES-256-GCM**
- Encryption key stored in environment variable (never in code)
- Unique IV (initialization vector) for each encryption

### Database Security

- **Row Level Security (RLS)** enabled on sessions table
- Users can only access their own sessions
- Session keys never exposed in API responses
- Only encrypted keys stored in database

### Token Delegation

- Uses SPL Token `approve()` instruction
- Users approve a **specific amount** (not unlimited)
- Session can only spend up to approved amount
- Automatically expires after 24 hours

## Key Differences from Custodial Model

| Custodial (Old) | Session Keys (New) |
|-----------------|-------------------|
| Platform fronts money | User's funds only |
| Platform takes on risk | Zero platform risk |
| Platform wallet balance needed | No balance needed |
| Manual funding required | Fully automated |
| Trust in platform custody | Self-custodial |

## Troubleshooting

### "No Active Session" Error

**Problem:** User sees 402 error when trying to watch video

**Solution:**
1. Check if session modal appeared on wallet connection
2. Verify user approved the transaction
3. Check browser console for errors
4. Query: `SELECT * FROM sessions WHERE user_wallet = 'USER_WALLET_HERE';`

### Session Not Creating

**Problem:** Modal shows but session doesn't create

**Solution:**
1. Check if `ADD_SESSIONS_TABLE.sql` was run
2. Verify `SESSION_ENCRYPTION_KEY` in `.env`
3. Check server logs for errors
4. Ensure user has enough SOL for gas fees

### "Insufficient Session Balance"

**Problem:** User runs out of session balance

**Solution:**
- User needs to create a new session with higher limit
- Current session will be replaced with new one
- Or wait for current session to expire and create new one

## Important Notes

1. **Sessions Expire After 24 Hours** - This is by design for security
2. **One Session Per User** - Creating a new session revokes the old one
3. **Gas Fees Paid by Session Key** - Session keypair needs small SOL balance for rent exemption (handled automatically)
4. **Devnet Only** - Currently configured for Solana devnet
5. **Production Checklist:**
   - [ ] Change `SOLANA_RPC_URL` to mainnet
   - [ ] Generate new `SESSION_ENCRYPTION_KEY`
   - [ ] Update `USDC_MINT_ADDRESS` to mainnet USDC
   - [ ] Test with real USDC on devnet first

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend                             │
├─────────────────────────────────────────────────────────┤
│  SessionManager → Monitors wallet connection            │
│  SessionCreationModal → Prompts user to create session  │
│  Account Page → Manages profile (username, picture)     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   API Routes                             │
├─────────────────────────────────────────────────────────┤
│  POST /api/sessions/create → Generate session keypair   │
│  POST /api/sessions/confirm → Store encrypted keypair   │
│  POST /api/payments/seamless → Process payment          │
│  GET /api/users/profile → Load user profile             │
│  PUT /api/users/profile → Update profile                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Services                              │
├─────────────────────────────────────────────────────────┤
│  SessionService → Create, encrypt, manage sessions      │
│  SessionPaymentService → Process delegated payments     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL)                       │
├─────────────────────────────────────────────────────────┤
│  sessions → Encrypted session keys & spending tracker   │
│  users → Profile data (username, picture, wallet)       │
│  payments → Transaction history                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Solana Blockchain                           │
├─────────────────────────────────────────────────────────┤
│  SPL Token approve() → Delegate spending authority      │
│  Session keypair signs → Transfers USDC on user behalf  │
│  Creator receives 97.65% → Platform receives 2.35%      │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Backend session management
2. ✅ Frontend session UI
3. ✅ User profile persistence
4. ⏳ Test on devnet with real USDC
5. ⏳ Deploy to production
6. ⏳ Monitor session usage and errors

## Support

If you encounter issues:

1. Check server logs: `npm run dev` output
2. Check browser console: F12 → Console tab
3. Verify database: Supabase dashboard → Table Editor → sessions
4. Check wallet transactions: Solana Explorer

---

**Congratulations!** You now have a fully functional X402 session keys system for seamless payments! 🎉
