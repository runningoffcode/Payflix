# Wallet Connection Guide

## What I Fixed

Your Phantom wallet wasn't connecting because of a missing environment variable. The issue has been resolved with these changes:

### 1. **Environment Variable Fix**
- ✅ Added `VITE_SOLANA_RPC_URL` to your `.env` file
- In Vite, all client-side environment variables must be prefixed with `VITE_`
- The app now correctly uses the Solana Devnet RPC endpoint

### 2. **Wallet Provider Improvements**
- ✅ Enabled `autoConnect={true}` to automatically reconnect your wallet
- ✅ Added multiple wallet options (Phantom, Solflare, Torus, Ledger)
- ✅ Improved wallet adapter configuration with proper network settings

### 3. **UI Enhancements**
- ✅ Added prominent "Connect Wallet" button on Home page
- ✅ Shows connection status with animated indicator
- ✅ Displays wallet address when connected
- ✅ Includes link to download Phantom wallet if needed

## How to Connect Your Wallet

1. **Install Phantom Wallet** (if you haven't already)
   - Visit: https://phantom.app/
   - Install the browser extension
   - Create or import a wallet
   - Switch to Devnet in Phantom settings

2. **Connect to PayFlix**
   - Open PayFlix in your browser
   - Click the purple "Connect Wallet" button in the top right
   - Select "Phantom" from the wallet modal
   - Approve the connection in the Phantom popup

3. **Verify Connection**
   - You should see your wallet address (e.g., "5x3F...kL9q")
   - A green dot indicates successful connection
   - Your USDC balance will appear in the sidebar

## Troubleshooting

### Phantom Wallet Not Appearing in Modal

**Problem**: The wallet modal opens but doesn't show Phantom
**Solution**:
1. Make sure Phantom extension is installed
2. Refresh the page
3. Click the Phantom icon in your browser toolbar to unlock it
4. Try connecting again

### Connection Keeps Failing

**Problem**: Connection attempts repeatedly fail
**Solution**:
1. Check that Phantom is set to **Devnet** (not Mainnet)
   - Open Phantom → Settings → Developer Settings → Testnet Mode
2. Clear your browser cache and reload
3. Try disconnecting and reconnecting

### "Transaction Failed" When Making Payments

**Problem**: USDC payment fails with error
**Solution**:
1. Get Devnet USDC from the faucet:
   ```bash
   # Get USDC on Devnet
   spl-token transfer --fund-recipient \
     4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
     <amount> \
     <your-wallet-address>
   ```
2. Or use: https://spl-token-faucet.com/

### Wallet Connects But Balance Shows $0.00

**Problem**: Connected but USDC balance is zero
**Solution**:
1. This is normal if you haven't received Devnet USDC yet
2. Follow the USDC setup guide: `USDC_PAYMENT_SETUP.md`
3. Get free Devnet USDC from faucets

## Testing the Connection

After connecting, you should be able to:

✅ See your wallet address in the sidebar
✅ View your USDC balance
✅ Click on videos to unlock with USDC payment
✅ Access your profile page
✅ Upload videos in Creator Studio (if you're a creator)

## Network Configuration

- **Network**: Devnet
- **RPC Endpoint**: https://api.devnet.solana.com
- **USDC Mint**: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

## Next Steps

1. ✅ Wallet connection is now fixed
2. Get Devnet SOL for transaction fees (from Solana faucet)
3. Get Devnet USDC for video purchases (see USDC_PAYMENT_SETUP.md)
4. Start exploring videos!

## Still Having Issues?

If you're still experiencing problems:

1. **Check browser console** (F12) for error messages
2. **Verify Phantom is on Devnet** in settings
3. **Try a different browser** (Chrome, Brave, Firefox)
4. **Disable other wallet extensions** that might conflict

## Technical Details

The wallet connection uses:
- `@solana/wallet-adapter-react`: Wallet hooks
- `@solana/wallet-adapter-react-ui`: Wallet modal UI
- `@solana/wallet-adapter-wallets`: Wallet adapters (Phantom, Solflare, etc.)
- Auto-reconnect enabled for seamless experience

Connection flow:
1. User clicks "Connect Wallet"
2. Wallet modal opens with available wallets
3. User selects Phantom
4. Phantom prompts for approval
5. App receives public key and connection status
6. Balance fetching and profile loading happen automatically
