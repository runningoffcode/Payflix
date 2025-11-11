/**
 * Generate Arweave Wallet
 * Creates a new Arweave wallet for uploading videos
 * Usage: npx ts-node scripts/generate-arweave-wallet.ts
 */

import Arweave from 'arweave';
import fs from 'fs';
import path from 'path';

async function generateWallet() {
  console.log('🔐 Generating Arweave Wallet...\n');

  // Initialize Arweave
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });

  // Generate wallet
  const wallet = await arweave.wallets.generate();

  // Get wallet address
  const address = await arweave.wallets.jwkToAddress(wallet);

  console.log('✅ Wallet Generated!\n');
  console.log('📋 Wallet Address:', address);
  console.log('\n⚠️  IMPORTANT: Keep this wallet safe and NEVER share it publicly!\n');

  // Save wallet to file
  const walletPath = path.join(process.cwd(), 'arweave-wallet.json');
  fs.writeFileSync(walletPath, JSON.stringify(wallet, null, 2));
  console.log(`💾 Wallet saved to: ${walletPath}`);

  // Show .env configuration
  console.log('\n📝 Add to your .env file:\n');
  console.log(`ARWEAVE_WALLET_PATH=${walletPath}`);
  console.log('# OR use ARWEAVE_WALLET_KEY for environment variable (more secure for production)');
  console.log(`# ARWEAVE_WALLET_KEY='${JSON.stringify(wallet)}'\n`);

  // Check balance
  try {
    const balance = await arweave.wallets.getBalance(address);
    const ar = arweave.ar.winstonToAr(balance);
    console.log(`💰 Current Balance: ${ar} AR`);

    if (parseFloat(ar) === 0) {
      console.log('\n⚠️  Your wallet has 0 AR. You need to fund it to upload videos.');
      console.log('\n📖 How to fund your wallet:');
      console.log('   1. MAINNET: Buy AR tokens from an exchange (Binance, KuCoin, etc.)');
      console.log('   2. TESTNET: Use Arweave faucet for testing');
      console.log(`      - Visit: https://faucet.arweave.net/`);
      console.log(`      - Enter your address: ${address}`);
      console.log('      - Get free test AR tokens\n');
    }
  } catch (error) {
    console.log('⚠️  Could not check balance (network issue)');
  }

  console.log('\n🔒 Security Tips:');
  console.log('   - Add arweave-wallet.json to .gitignore');
  console.log('   - Never commit wallet files to version control');
  console.log('   - For production, use ARWEAVE_WALLET_KEY environment variable');
  console.log('   - Keep backups of your wallet in a secure location\n');

  // Update .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('arweave-wallet.json')) {
      gitignore += '\n# Arweave wallet\narweave-wallet.json\n';
      fs.writeFileSync(gitignorePath, gitignore);
      console.log('✅ Added arweave-wallet.json to .gitignore\n');
    }
  }

  console.log('🎉 Setup complete! Your Arweave wallet is ready.\n');
  console.log('📚 Estimated costs:');
  console.log('   - 100MB video: ~0.001-0.01 AR (~$0.02-$0.20)');
  console.log('   - 1GB video: ~0.01-0.1 AR (~$0.20-$2.00)');
  console.log('   - Prices vary based on network demand\n');
}

generateWallet().catch((error) => {
  console.error('❌ Error generating wallet:', error);
  process.exit(1);
});
