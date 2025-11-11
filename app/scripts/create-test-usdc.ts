/**
 * Create a Test USDC Token for PayFlix
 * This creates a new SPL token on devnet that we have mint authority for
 * Then we can airdrop unlimited amounts for testing!
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
} from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function createTestUSDC(recipientWallet: string, initialAmount: number) {
  try {
    console.log('🏦 Creating PayFlix Test USDC Token...\n');

    // Connect to devnet
    const connection = new Connection(DEVNET_RPC, 'confirmed');

    // Load facilitator wallet (mint authority and payer)
    if (!process.env.PLATFORM_WALLET_PRIVATE_KEY) {
      throw new Error('PLATFORM_WALLET_PRIVATE_KEY not found in .env');
    }

    const facilitatorKeyData = JSON.parse(process.env.PLATFORM_WALLET_PRIVATE_KEY);
    const facilitator = Keypair.fromSecretKey(new Uint8Array(facilitatorKeyData));

    console.log(`✅ Facilitator wallet: ${facilitator.publicKey.toBase58()}`);

    // Check facilitator SOL balance
    const balance = await connection.getBalance(facilitator.publicKey);
    console.log(`💵 Facilitator SOL balance: ${balance / 1e9} SOL`);

    if (balance < 0.1 * 1e9) {
      console.log('\n⚠️  Facilitator needs more SOL!');
      console.log('Run: solana airdrop 1 ' + facilitator.publicKey.toBase58() + ' --url devnet');
      return;
    }

    console.log('\n📝 Creating new SPL token (Test USDC)...');

    // Create mint (6 decimals like USDC)
    const mint = await createMint(
      connection,
      facilitator,        // Payer
      facilitator.publicKey, // Mint authority
      facilitator.publicKey, // Freeze authority
      6                   // 6 decimals like real USDC
    );

    console.log(`\n✅ Test USDC Token Created!`);
    console.log(`   Mint Address: ${mint.toBase58()}`);
    console.log(`   Decimals: 6`);
    console.log(`   Mint Authority: ${facilitator.publicKey.toBase58()}\n`);

    console.log('💾 Add this to your .env file:');
    console.log(`USDC_MINT_ADDRESS=${mint.toBase58()}`);
    console.log(`VITE_USDC_MINT_ADDRESS=${mint.toBase58()}\n`);

    // Mint initial supply to recipient
    const recipient = new PublicKey(recipientWallet);

    console.log(`📝 Creating token account for recipient...`);
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      facilitator,
      mint,
      recipient
    );

    console.log(`✅ Recipient token account: ${recipientTokenAccount.address.toBase58()}\n`);

    console.log(`💰 Minting ${initialAmount} Test USDC to recipient...`);
    const signature = await mintTo(
      connection,
      facilitator,
      mint,
      recipientTokenAccount.address,
      facilitator, // Mint authority
      initialAmount * 1_000_000 // Convert to 6 decimals
    );

    console.log(`✅ Minted ${initialAmount} Test USDC!`);
    console.log(`   Signature: ${signature}\n`);

    // Also mint to facilitator for testing
    console.log(`💰 Minting 1000 Test USDC to facilitator for gas...`);
    const facilitatorTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      facilitator,
      mint,
      facilitator.publicKey
    );

    await mintTo(
      connection,
      facilitator,
      mint,
      facilitatorTokenAccount.address,
      facilitator,
      1000 * 1_000_000
    );

    console.log(`✅ Setup complete!\n`);

    console.log('📋 NEXT STEPS:');
    console.log('1. Update your .env file with the new USDC_MINT_ADDRESS');
    console.log('2. Restart your server');
    console.log('3. Connect your wallet and create a new session');
    console.log('4. Start watching videos!\n');

    console.log('💡 TO MINT MORE TEST USDC:');
    console.log(`   npx ts-node scripts/mint-test-usdc.ts ${recipientWallet} <amount>\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get command line arguments
const recipientWallet = process.argv[2] || 'J3WmMHUixgfcUtL5ov4Cn6LE65cDybgAg7mc1PWGyVY';
const initialAmount = parseFloat(process.argv[3] || '100');

createTestUSDC(recipientWallet, initialAmount);
