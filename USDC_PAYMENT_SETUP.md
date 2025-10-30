# USDC Payment Setup Guide

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
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
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
