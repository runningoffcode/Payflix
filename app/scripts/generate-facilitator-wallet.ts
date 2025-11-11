import { Keypair } from '@solana/web3.js';

/**
 * Generate a test facilitator wallet for X402 payments on Devnet
 */
async function generateFacilitatorWallet() {
  console.log('🔑 Generating new facilitator wallet for Devnet...\n');

  // Generate new keypair
  const keypair = Keypair.generate();

  // Get the private key as byte array
  const privateKeyArray = Array.from(keypair.secretKey);

  // Get the public key
  const publicKey = keypair.publicKey.toBase58();

  console.log('✅ Wallet generated successfully!\n');
  console.log('📋 Wallet Details:');
  console.log('─'.repeat(60));
  console.log(`Public Key:  ${publicKey}`);
  console.log(`Private Key Array (full):`);
  console.log(JSON.stringify(privateKeyArray));
  console.log('─'.repeat(60));

  console.log('\n📝 Add this to your .env file:');
  console.log('\n# X402 Facilitator wallet private key (signs transactions, pays gas)');
  console.log(`PLATFORM_WALLET_PRIVATE_KEY='${JSON.stringify(privateKeyArray)}'`);

  console.log('\n💰 Fund the wallet with devnet SOL for gas fees:');
  console.log(`   Visit: https://faucet.solana.com/`);
  console.log(`   Or use: curl -X POST "https://api.devnet.solana.com" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"requestAirdrop","params":["${publicKey}",1000000000]}'`);
  console.log(`   Public Address: ${publicKey}`);

  console.log('\n⚠️  IMPORTANT: This wallet is for DEVNET TESTING ONLY!');
  console.log('   Never use test wallets in production or store real funds!');
}

generateFacilitatorWallet().catch(console.error);
