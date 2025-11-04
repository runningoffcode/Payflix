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
