# Arweave Setup Guide for PayFlix

## What is Arweave?

Arweave is a decentralized storage network that provides **permanent, censorship-resistant file storage**. Perfect for storing videos permanently!

---

## Option 1: Quick Start (Recommended for Development)

For development/testing, you can skip Arweave for now and use **local file storage** or **Supabase storage** instead.

### Update your `.env` file:

```bash
# Set to empty or skip Arweave
ARWEAVE_WALLET_KEY=
ARWEAVE_WALLET_PATH=

# Use local storage for now
VIDEO_STORAGE_PATH=./storage/videos
```

**This allows you to test video uploads without needing an Arweave wallet immediately.**

---

## Option 2: Full Arweave Integration (Production)

If you want permanent decentralized storage with Arweave:

### Step 1: Get an Arweave Wallet

1. **Go to ArConnect (Browser Extension)**
   - Chrome: https://chrome.google.com/webstore/detail/arconnect/einnioafmpimabjcddiinlhmijaionap
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/arconnect/

2. **Install ArConnect and create a new wallet**
   - Follow the setup instructions
   - **SAVE YOUR SEED PHRASE SECURELY!**

3. **Export your wallet JSON**
   - Click ArConnect extension
   - Go to Settings → Wallets
   - Click "Export Keyfile" on your wallet
   - This downloads a JSON file (e.g., `arweave-keyfile.json`)

### Step 2: Fund Your Wallet

Arweave storage costs AR tokens:

1. **Get Test AR (Testnet/Devnet)**
   - Arweave doesn't have a testnet, but uploads are very cheap
   - Use the faucet: https://faucet.arweave.net/

2. **Buy AR Tokens (Mainnet)**
   - Buy on exchanges: Binance, KuCoin, Gate.io
   - Send to your Arweave wallet address

**Cost Example:**
- 1 GB permanent storage ≈ 0.007 AR (~$0.50-$2 depending on AR price)
- A 100 MB video costs ≈ 0.0007 AR (~$0.05-$0.20)

### Step 3: Configure PayFlix

1. **Move your Arweave keyfile to your project:**

```bash
mkdir -p /Users/juice/Desktop/flix/Payflix/keys
mv ~/Downloads/arweave-keyfile.json /Users/juice/Desktop/flix/Payflix/keys/
```

2. **Update `.env` file:**

```bash
# Arweave Configuration
ARWEAVE_HOST=arweave.net
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https
ARWEAVE_GATEWAY=https://arweave.net
ARWEAVE_WALLET_PATH=./keys/arweave-keyfile.json
```

3. **Restart your server** - it should now say:
```
✅ Arweave wallet configured
```

---

## Option 3: Alternative Storage Providers

If you don't want to use Arweave, you can use:

1. **Supabase Storage** (Already configured!)
   - Easier to set up
   - Cheaper for development
   - Not permanent/decentralized
   - Good for testing

2. **IPFS (InterPlanetary File System)**
   - Decentralized
   - Cheaper than Arweave
   - Not permanent (requires pinning services)

3. **Cloudflare R2 or AWS S3**
   - Centralized but reliable
   - Pay-as-you-go pricing
   - Easy integration

---

## Which Option Should I Choose?

### For Development/Testing:
**→ Use Option 1 (Skip Arweave) or Supabase Storage**
- Fastest to set up
- No cost
- Good for testing features

### For Production/Real Users:
**→ Use Option 2 (Arweave)**
- Videos stored forever
- Censorship-resistant
- True Web3 experience
- Small one-time cost per upload

---

## Next Steps After Setup

Once you've chosen and configured your storage:

1. The CreatorStudio upload will automatically use your configured storage
2. Test uploading a small video file
3. Verify the video URL is accessible

---

## Troubleshooting

### "No Arweave wallet configured" warning
- This is fine for development
- The app will work with Supabase storage or local files

### "Insufficient AR balance" error
- Your Arweave wallet needs more AR tokens
- Check balance at: https://viewblock.io/arweave
- Use faucet or buy more AR

### Uploads are slow
- Arweave uploads can take time for large files
- Consider implementing chunked uploads
- Show progress bar to users

---

## Questions?

Check Arweave documentation: https://docs.arweave.org/developers/
