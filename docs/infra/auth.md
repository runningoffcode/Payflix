# Authentication & Session Playbook

Centralizes PayFlix auth flows: Privy multi-login onboarding, X402 session keys, and environment hygiene. Legacy guides (`PRIVY_SETUP_GUIDE.md`, `SESSION_KEYS_SETUP.md`, `IMPORTANT_ENV_FIX.md`) remain as appendices.

## Privy Integration (Multi-Login)

- Supports wallets + email + social; embedded wallets auto-provision Solana accounts for mainstream users.
- Dashboard steps: create app, enable login methods, enable embedded wallets (Solana), configure Devnet/Mainnet RPC, grab `VITE_PRIVY_APP_ID`.
- `.env` snippet:

```env
VITE_PRIVY_APP_ID=clxxxxxxxx
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

- Testing matrix: crypto wallet login, email login, social login, confirm X402 works post-onboarding.

## Session Keys (X402 seamless payments)

- Backend services: `session.service.ts`, `session-payment.service.ts`, routes under `/api/sessions/*`, payments now rely on `sessionPaymentService`.
- Frontend: `SessionCreationModal`, `SessionManager`, account/profile integration; creators upgrade flows on `/account`.
- Database: run `ADD_SESSIONS_TABLE.sql`, store encrypted keys, enforce 24h expiry.
- Env: `SESSION_ENCRYPTION_KEY` (64-byte hex) required.
- Flow summary: wallet connects → session check → modal prompts spending limit → ICS approves delegation → session stored → future payments use session key (no wallet popups).

## Environment Hygiene

- Ensure shell envs do not override `.env` keys (e.g., `SUPABASE_SERVICE_KEY`).
- Remove stray exports from `~/.zshrc`/`~/.bashrc`, source shell, verify `echo $SUPABASE_SERVICE_KEY` is empty, restart dev server.

## Troubleshooting

| Issue                             | Resolution                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Privy modal missing login options | Re-check Privy dashboard login methods + embedded wallets config.                                        |
| Session modal never appears       | Confirm `SessionManager` mounted and `/api/sessions/active` reachable; check session table migration.    |
| Payments still prompt wallet      | Session expired or not approved; revoke + recreate session, ensure `sessionPaymentService` logs success. |
| SUPABASE_SERVICE_KEY stuck        | Follow env hygiene steps (Appendix C) to clear shell overrides.                                          |

---

## Appendices

### Appendix A — PRIVY_SETUP_GUIDE.md (verbatim)

# Privy.io Integration Setup Guide

## What is Privy?

Privy is a unified authentication platform that supports:

- **Crypto wallets** (Phantom, Solflare, etc.) for crypto-native users
- **Email/password** login for mainstream users
- **Social logins** (Google, Twitter, Discord, etc.)
- **Embedded Solana wallets** automatically created for non-crypto users

All users get a Solana wallet address, making your X402 payment flow work identically for everyone!

---

## Step 1: Create Your Privy Account

1. **Go to Privy Dashboard**: https://dashboard.privy.io/

2. **Sign up with your email** or connect your wallet

3. **Create a new app**:
   - Click "Create App"
   - App Name: `PayFlix`
   - App Description: `Web3 video platform with X402 payments`

---

## Step 2: Get Your App ID

1. After creating your app, you'll see your **App ID** on the dashboard
   - It looks like: `clxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **Copy your App ID**

---

## Step 3: Configure Login Methods

1. In your Privy dashboard, go to **Settings** → **Login methods**

2. **Enable these login methods**:
   - ✅ Wallet (Phantom, Solflare, etc.)
   - ✅ Email
   - ✅ Google
   - ✅ Twitter
   - ✅ Discord

3. **Enable Embedded Wallets**:
   - Go to **Embedded Wallets** settings
   - Enable "Create embedded wallets for users without wallets"
   - Select **Solana** as the blockchain

---

## Step 4: Configure Solana Network

1. Go to **Settings** → **Blockchains**

2. **Add Solana Devnet**:
   - Network: `Solana Devnet`
   - RPC URL: Your devnet RPC (or use default)

3. **For production**, add Solana Mainnet later

---

## Step 5: Add App ID to Your .env File

Create or update your `.env` file in the root directory:

```bash
# Privy Configuration
VITE_PRIVY_APP_ID=your_app_id_here

# Solana RPC (optional - uses default if not set)
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

**Replace `your_app_id_here` with your actual App ID from Step 2!**

---

## Step 6: Test the Integration

1. **Start your dev server**:

   ```bash
   npm run dev
   ```

2. **Test crypto wallet login**:
   - Click "Connect Wallet"
   - Connect with Phantom/Solflare
   - Should work seamlessly!

3. **Test email login**:
   - Click "Connect Wallet" (will show Privy modal)
   - Choose "Email"
   - Enter your email
   - Verify with code
   - Privy auto-creates a Solana wallet for you!

4. **Test social login**:
   - Click "Connect Wallet"
   - Choose Google/Twitter/Discord
   - Privy auto-creates a Solana wallet!

---

## Step 7: Customize Branding (Optional)

1. Go to **Settings** → **Appearance**

2. Customize:
   - **Logo**: Upload PayFlix logo
   - **Theme**: Dark mode (already configured)
   - **Accent Color**: `#C56BCE` (PayFlix purple - already set)
   - **App Name**: PayFlix

---

## How It Works

### For Crypto Users:

```
User → Connects Phantom → Privy detects wallet → Uses existing wallet address → X402 payments work!
```

### For Mainstream Users:

```
User → Logs in with email/Google → Privy creates embedded Solana wallet → User gets wallet address → X402 payments work!
```

### Both paths result in:

- User has Solana wallet address
- User can deposit USDC
- User can create X402 sessions
- User can pay for videos seamlessly
- Creators get 97.15% of every payment

---

## Pricing

- **Free**: Up to 1,000 monthly active users (MAU)
- **$99/month**: After 1,000 MAU
- No transaction fees - Privy is just authentication

Your 97.15% / 2.85% revenue split is unchanged!

---

## Support

- **Privy Docs**: https://docs.privy.io/
- **Privy Discord**: https://discord.gg/privy
- **Dashboard**: https://dashboard.privy.io/

---

## Next Steps

After adding your `VITE_PRIVY_APP_ID` to `.env`:

1. Restart dev server: `npm run dev`
2. Test wallet connection
3. Test email login
4. Test social login
5. Verify X402 payments work for all user types

Your platform now supports BOTH crypto-native AND mainstream users! 🚀

### Appendix B — SESSION_KEYS_SETUP.md (verbatim)

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

| Custodial (Old)                | Session Keys (New) |
| ------------------------------ | ------------------ |
| Platform fronts money          | User's funds only  |
| Platform takes on risk         | Zero platform risk |
| Platform wallet balance needed | No balance needed  |
| Manual funding required        | Fully automated    |
| Trust in platform custody      | Self-custodial     |

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

### Appendix C — IMPORTANT_ENV_FIX.md (verbatim)

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

# USDC Payment Setup Guide

### Appendix D — USDC_PAYMENT_SETUP.md (verbatim)

## 🎉 Real Wallet Connection & USDC Payments Now Active!

Your PayFlix platform now supports **real Solana wallet connections** and **actual USDC payments** on Devnet!

---

## 🚀 What's New

### Updated Components:

- **[VideoPlayer.tsx](src/pages/VideoPlayer.tsx)** - Now uses real Solana wallet adapter hooks
- **Real USDC Transfers** - Actual SPL token transfers using @solana/spl-token
- **Transaction Confirmation** - Waits for blockchain confirmation before granting access
- **Error Handling** - Proper error messages for insufficient funds, missing token accounts, etc.

### Features:

- ✅ Connect with Phantom, Solflare, or other Solana wallets
- ✅ Send real USDC to unlock videos
- ✅ Transaction signatures recorded on-chain
- ✅ Instant access after payment confirmation

---

## 📋 Prerequisites

1. **Phantom Wallet** (or Solflare)
   - Install from: https://phantom.app/
   - Create a new wallet or import existing one

2. **Switch to Devnet**
   - Open Phantom wallet
   - Settings → Developer Settings → Toggle "Testnet Mode"
   - Switch network to "Devnet"

3. **Get Devnet SOL** (for transaction fees)
   - Visit: https://faucet.solana.com/
   - Enter your wallet address
   - Request 1-2 SOL

4. **Get Devnet USDC**
   - Your wallet address needs USDC tokens for payments
   - Use one of these methods:

---

## 💰 How to Get Devnet USDC

### Method 1: SPL Token Faucet (Easiest)

```bash
# Install Solana CLI if you haven't
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Get your wallet address from Phantom

# Request USDC (Devnet mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
spl-token airdrop 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 100 --owner YOUR_WALLET_ADDRESS --url https://api.devnet.solana.com
```

### Method 2: Using Web Faucet

1. Go to: https://spl-token-faucet.com/
2. Select "Devnet"
3. Enter your wallet address
4. Select "USDC" token
5. Request tokens

### Method 3: Create Your Own USDC Account

```bash
# Create USDC token account for your wallet
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --owner YOUR_WALLET_ADDRESS --url https://api.devnet.solana.com

# Mint USDC to yourself (if you have mint authority)
spl-token mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 100 YOUR_TOKEN_ACCOUNT --url https://api.devnet.solana.com
```

---

## 🎬 Testing the Payment Flow

### 1. Start the Application

```bash
npm run dev
```

### 2. Connect Your Wallet

- Click "Connect Wallet" in the sidebar
- Select Phantom (or your preferred wallet)
- Approve the connection

### 3. Browse Videos

- Navigate to the Home page
- You'll see sample videos with prices (0.01 USDC each)
- Click on any video to view

### 4. Unlock a Video

- Click on a video thumbnail
- You'll see the video player with an "Unlock" button
- Click the unlock button
- Phantom will pop up asking you to approve the transaction
- Approve the transaction

### 5. Watch the Video

- The payment will be processed on the blockchain
- After confirmation, you'll get access to the video
- You can now watch it unlimited times

---

## 🔍 Monitoring Transactions

### In Browser Console

```javascript
// Open DevTools (F12)
// You'll see detailed logs:
=== X402 Payment Flow ===
1. Creating USDC transfer transaction...
   Amount: 0.01 USDC
   To: [Creator Wallet]
2. Sending transaction...
   Transaction sent: [Signature]
3. Confirming transaction...
4. Verifying payment with backend...
5. Payment verified!
   Transaction: [Signature]
=== Payment Complete ===
```

### On Solana Explorer

1. Copy the transaction signature from console
2. Visit: https://explorer.solana.com/?cluster=devnet
3. Paste the signature
4. View full transaction details

### Check Your Balance

```bash
# Check USDC balance
spl-token balance 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --owner YOUR_WALLET_ADDRESS --url https://api.devnet.solana.com
```

---

## 🔧 Configuration

### USDC Mint Address (Devnet)

```typescript
// Already configured in VideoPlayer.tsx
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
```

### Network Configuration

```typescript
// In SolanaWalletProvider.tsx
const network = WalletAdapterNetwork.Devnet;
const endpoint = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(network);
```

### Custom RPC (Optional)

Add to `.env`:

```bash
VITE_SOLANA_RPC_URL=https://your-custom-rpc-endpoint.com
```

---

## 🐛 Troubleshooting

### Error: "Token account not found"

**Solution:** Create a USDC token account first

```bash
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url https://api.devnet.solana.com
```

### Error: "Insufficient funds"

**Solution:** Get more USDC from faucet or check your balance

```bash
spl-token balance 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url https://api.devnet.solana.com
```

### Error: "Insufficient SOL"

**Solution:** You need SOL for transaction fees

- Visit https://faucet.solana.com/
- Request more Devnet SOL

### Transaction Fails Silently

**Solutions:**

1. Check you're on Devnet (not Mainnet!)
2. Try a custom RPC endpoint
3. Check Solana network status: https://status.solana.com/

### Wallet Not Connecting

**Solutions:**

1. Refresh the page
2. Disconnect wallet from Phantom settings
3. Try incognito mode
4. Clear browser cache

---

## 📊 Sample Videos Setup

To test with sample videos:

1. **Apply RLS Policies** (run in Supabase SQL Editor):

```bash
# Execute the SQL file
cat FIX_VIDEOS_RLS.sql
```

2. **Add Sample Videos**:

```bash
npm run seed
```

3. **Update Creator Wallets**:
   Make sure video creator wallets in the database are valid Solana addresses that can receive USDC.

---

## 🎯 Production Checklist

When moving to Mainnet:

- [ ] Update network to `WalletAdapterNetwork.Mainnet`
- [ ] Update USDC mint to Mainnet address: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- [ ] Use production RPC endpoint (Alchemy, QuickNode, etc.)
- [ ] Implement proper backend payment verification
- [ ] Add transaction fee handling
- [ ] Implement retry logic for failed transactions
- [ ] Add comprehensive error logging
- [ ] Set up transaction monitoring/alerts

---

## 💡 Testing Tips

1. **Start Small**: Test with 0.01 USDC amounts first
2. **Check Balances**: Monitor your USDC balance before/after
3. **Use Devnet**: Always test on Devnet before Mainnet
4. **Save Signatures**: Keep transaction signatures for debugging
5. **Test Edge Cases**: Try with 0 balance, disconnected wallet, etc.

---

## 📞 Support

If you encounter issues:

1. Check browser console for error messages
2. Verify you're on Devnet
3. Ensure you have USDC in your wallet
4. Check Solana network status
5. Try with a different wallet

---

## 🎉 Success!

You're now ready to accept real USDC payments for your videos!

The payment flow is fully functional on Devnet. Users can:

- Connect their Solana wallets
- Send USDC to unlock videos
- Watch unlimited after payment
- All transactions recorded on-chain

Happy building! 🚀

# X402 + Corbits Payment System Implementation

## 🎯 Overview

I've completely restructured PayFlix's payment system to use the **X402 Protocol** with **Corbits** agents and a **Kora-based facilitator**. This provides a more robust, standardized approach to micropayments.

## ✅ What Has Been Completed

### 1. Backend Architecture

#### **X402 Facilitator Service** ([server/services/x402-facilitator.service.ts](server/services/x402-facilitator.service.ts))

- ✅ Payment verification without broadcasting
- ✅ Payment settlement with blockchain confirmation
- ✅ Transaction simulation for validation
- ✅ Supports both legacy and versioned Solana transactions
- ✅ Fee payer management (Kora role)
- ✅ X-PAYMENT header parsing
- ✅ Creates 402 Payment Required responses

#### **X402 Middleware** ([server/middleware/x402.middleware.ts](server/middleware/x402.middleware.ts))

- ✅ `requireX402Payment()` - Protects routes with payment requirement
- ✅ `checkExistingPayment()` - Allows repeat access for paid users
- ✅ Automatic payment recording in database
- ✅ Revenue split calculation
- ✅ Error handling for all payment scenarios

#### **Facilitator API Routes** ([server/routes/facilitator.routes.ts](server/routes/facilitator.routes.ts))

- ✅ `GET /api/facilitator/supported` - Returns capabilities
- ✅ `POST /api/facilitator/verify` - Verifies transactions
- ✅ `POST /api/facilitator/settle` - Settles payments on-chain
- ✅ `GET /api/facilitator/health` - Health check

#### **Updated Video Routes** ([server/routes/videos.routes.ts](server/routes/videos.routes.ts))

- ✅ `/api/videos/:id/stream` now uses X402 middleware
- ✅ Returns HTTP 402 with payment details when unpaid
- ✅ Processes X-PAYMENT header automatically
- ✅ Old `/verify-payment` endpoint commented out (deprecated)

### 2. Dependencies Installed

```json
{
  "@faremeter/payment-solana": "^0.10.2",
  "@faremeter/fetch": "^0.10.2",
  "@faremeter/info": "^0.10.2",
  "bs58": "^6.0.0"
}
```

## ⚠️ What Needs To Be Fixed

### 1. Database Methods (CRITICAL)

The middleware uses two database methods that don't exist yet:

**File**: [server/middleware/x402.middleware.ts](server/middleware/x402.middleware.ts:169)

```typescript
// Line 169 - Method doesn't exist
await db.incrementVideoViews(videoId);

// Line 194 - Method doesn't exist
const existingPayment = await db.getUserPaymentForVideo(user.id, videoId);
```

**Solution**: Add these methods to your database interface:

```typescript
// In server/database/database.interface.ts or wherever Database is defined
interface Database {
  // ... existing methods ...

  incrementVideoViews(videoId: string): Promise<void>;
  getUserPaymentForVideo(
    userId: string,
    videoId: string,
  ): Promise<Payment | null>;
}
```

Then implement in both in-memory and Supabase database classes.

### 2. Platform Wallet Configuration

**Issue**: The X402 Facilitator needs a properly configured platform wallet to sign transactions (Kora role).

**Current Status**: Shows warning: "⚠️ X402 Facilitator: No fee payer configured"

**Solution**: Generate a Solana keypair and add to `.env`:

```bash
# Generate new keypair
solana-keygen new --outfile platform-wallet.json

# Get the private key as JSON array
cat platform-wallet.json
```

Then update `.env`:

```env
PLATFORM_WALLET_PRIVATE_KEY=[123,456,789,...]  # Your keypair array
```

## 🚧 Frontend Integration (Not Started)

The frontend needs to be updated to use the new X402 + Corbits payment flow. Here's what needs to be done:

### Required Changes to VideoPlayer.tsx

### Appendix E — X402_CORBITS_IMPLEMENTATION.md (verbatim)

# X402 + Corbits Payment System Implementation

Replace the current payment flow with X402 + Corbits:

```typescript
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import bs58 from "bs58";

// 1. Request video - receive 402 response
const response = await fetch(`http://localhost:5001/api/videos/${id}/stream`, {
  headers: {
    "x-wallet-address": publicKey.toBase58(),
  },
});

if (response.status === 402) {
  // 2. Get payment details from response
  const paymentInfo = await response.json();

  // 3. Create Solana transaction
  const transaction = new Transaction();
  const fromATA = await getAssociatedTokenAddress(USDC_MINT, publicKey);
  const toATA = await getAssociatedTokenAddress(
    USDC_MINT,
    new PublicKey(paymentInfo.payment.recipient),
  );

  transaction.add(
    createTransferInstruction(
      fromATA,
      toATA,
      publicKey,
      paymentInfo.payment.amount * 1_000_000, // Convert to lamports
    ),
  );

  // 4. Sign transaction (don't send yet!)
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = publicKey;

  const signedTx = await signTransaction(transaction);
  const serialized = signedTx.serialize({ requireAllSignatures: false });

  // 5. Create X-PAYMENT header
  const payload = {
    transaction: bs58.encode(serialized),
    network: "devnet",
    token: USDC_MINT.toBase58(),
    amount: paymentInfo.payment.amount,
    recipient: paymentInfo.payment.recipient,
  };

  const paymentHeader = `x402 ${Buffer.from(JSON.stringify(payload)).toString("base64")}`;

  // 6. Re-request with X-PAYMENT header
  const finalResponse = await fetch(
    `http://localhost:5001/api/videos/${id}/stream`,
    {
      headers: {
        "x-wallet-address": publicKey.toBase58(),
        "x-payment": paymentHeader,
      },
    },
  );

  if (finalResponse.ok) {
    // Payment verified and settled!
    const data = await finalResponse.json();
    console.log("Access granted:", data);
  }
}
```

### Alternative: Use Corbits Wrapped Fetch

Corbits provides a wrapped fetch that handles X402 automatically:

```typescript
import { createPaymentHandler } from "@faremeter/payment-solana";
import { wrappedFetch } from "@faremeter/fetch";

// Create payment handler
const paymentHandler = createPaymentHandler(
  wallet, // Solana wallet
  usdcMintAddress, // USDC token
  connection, // Solana connection
);

// Use wrapped fetch - it handles X402 automatically!
const response = await wrappedFetch(
  `http://localhost:5001/api/videos/${id}/stream`,
  {
    headers: { "x-wallet-address": publicKey.toBase58() },
  },
  paymentHandler,
);
```

## 📊 New Payment Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────1───▶│  API Server  │         │ Facilitator │
│  (Browser)  │         │  (Express)   │         │   (Kora)    │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │   HTTP 402             │                        │
      │   Payment Required     │                        │
      │◀────────────────────   │                        │
      │                        │                        │
      │   Create Signed TX     │                        │
      │                        │                        │
      │   X-PAYMENT Header     │                        │
      │────────────────────────▶                        │
      │                        │   Verify TX            │
      │                        │───────────────────────▶│
      │                        │                        │
      │                        │   Valid ✓              │
      │                        │◀───────────────────────│
      │                        │   Settle TX            │
      │                        │───────────────────────▶│
      │                        │                        │
      │                        │   Signature            │
      │                        │◀───────────────────────│
      │                        │                        │
      │   Video Stream ✓       │                        │
      │◀────────────────────────                        │
```

## 🔑 Key Advantages

1. **Standard Protocol**: X402 is an open standard for micropayments
2. **Facilitator Pattern**: Abstracts blockchain complexity from API server
3. **Gasless for Users**: Facilitator pays gas fees (funded from platform fees)
4. **Automatic Settlement**: Payments are verified then settled on-chain
5. **Repeat Access**: Once paid, users can access content without re-payment
6. **Corbits Integration**: Can use Corbits agents for automated payment handling

## 🛠️ Testing the System

### 1. Test Facilitator Endpoints

```bash
# Check facilitator health
curl http://localhost:5001/api/facilitator/health

# Get supported configuration
curl http://localhost:5001/api/facilitator/supported
```

### 2. Test Video Access (Should Return 402)

```bash
curl http://localhost:5001/api/videos/1/stream \
  -H "x-wallet-address: YOUR_WALLET_ADDRESS"
```

Expected: HTTP 402 with payment details

### 3. Test with X-PAYMENT Header

(Requires creating a signed transaction first - see frontend integration above)

## 📚 Documentation References

- **X402 Protocol**: https://solana.com/developers/guides/getstarted/build-a-x402-facilitator
- **Corbits Docs**: https://docs.corbits.dev/build-with-corbits/quickstart
- **Facilitator Pattern**: https://docs.corbits.dev/concepts/facilitator

## 🚀 Next Steps

1. **Fix Database Methods** (Critical)
   - Add `incrementVideoViews()` method
   - Add `getUserPaymentForVideo()` method

2. **Configure Platform Wallet**
   - Generate Solana keypair
   - Add to `.env` file
   - Fund with SOL for gas fees

3. **Update Frontend**
   - Install `bs58` package in frontend
   - Implement X402 payment flow in VideoPlayer.tsx
   - Or use Corbits wrapped fetch for automatic handling

4. **Test End-to-End**
   - Request video without payment (expect 402)
   - Create payment transaction
   - Send with X-PAYMENT header
   - Verify access granted

## ⚡ Quick Start Commands

```bash
# Install additional frontend dependency
npm install bs58

# Generate platform wallet
solana-keygen new --outfile platform-wallet.json

# Start servers (already configured)
npm run dev

# Test facilitator
curl http://localhost:5001/api/facilitator/health
```

## 📝 Files Changed

- ✅ [server/services/x402-facilitator.service.ts](server/services/x402-facilitator.service.ts) - NEW
- ✅ [server/middleware/x402.middleware.ts](server/middleware/x402.middleware.ts) - REPLACED
- ✅ [server/routes/facilitator.routes.ts](server/routes/facilitator.routes.ts) - NEW
- ✅ [server/routes/videos.routes.ts](server/routes/videos.routes.ts) - MODIFIED
- ✅ [server/index.ts](server/index.ts) - MODIFIED (added facilitator routes)
- ✅ [.env](.env) - MODIFIED (added VITE_SOLANA_RPC_URL)
- ✅ [package.json](package.json) - MODIFIED (added Corbits packages)
- ⚠️ [src/pages/VideoPlayer.tsx](src/pages/VideoPlayer.tsx) - NEEDS UPDATE

## 🎓 Understanding the Code

### Facilitator Service

The facilitator acts as Kora - it verifies transactions are valid, then signs and broadcasts them to Solana. This removes the need for users to have SOL for gas.

### Middleware Flow

1. Check if user already paid (checkExistingPayment)
2. If not, require X-PAYMENT header (requireX402Payment)
3. Verify transaction structure
4. Settle on blockchain
5. Record in database
6. Grant access

### Frontend Integration

The frontend creates a Solana transaction, signs it, then sends it in the X-PAYMENT header. The facilitator handles settlement.

---

**Status**: Backend 95% complete | Frontend 0% complete | Database fixes needed
