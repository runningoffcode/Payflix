/**
 * Airdrop Devnet USDC to a wallet
 * This script mints devnet USDC tokens to a specified wallet address
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const DEVNET_RPC = 'https://api.devnet.solana.com';
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

async function airdropUSDC(recipientWallet: string, amount: number) {
  try {
    console.log('🚀 Airdropping Devnet USDC...');
    console.log(`   Recipient: ${recipientWallet}`);
    console.log(`   Amount: ${amount} USDC\n`);

    // Connect to devnet
    const connection = new Connection(DEVNET_RPC, 'confirmed');

    // Load facilitator wallet (to pay for transaction fees)
    if (!process.env.PLATFORM_WALLET_PRIVATE_KEY) {
      throw new Error('PLATFORM_WALLET_PRIVATE_KEY not found in .env');
    }

    const facilitatorKeyData = JSON.parse(process.env.PLATFORM_WALLET_PRIVATE_KEY);
    const facilitator = Keypair.fromSecretKey(new Uint8Array(facilitatorKeyData));

    console.log(`✅ Facilitator wallet loaded: ${facilitator.publicKey.toBase58()}`);

    // Get recipient public key
    const recipient = new PublicKey(recipientWallet);

    // Get or create recipient's USDC token account
    console.log('📝 Getting recipient USDC account...');
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      facilitator, // Payer
      USDC_MINT,
      recipient
    );

    console.log(`✅ Recipient USDC account: ${recipientTokenAccount.address.toBase58()}`);

    // Mint USDC to recipient (devnet tokens can be minted freely)
    console.log(`\n💰 Minting ${amount} USDC...`);

    // Note: On devnet, we need mint authority. Since we don't have it for the standard devnet USDC,
    // let's just show what would happen and provide instructions instead.

    console.log('\n⚠️  IMPORTANT:');
    console.log('The standard Devnet USDC mint (4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU) is controlled by Circle.');
    console.log('We cannot mint to it directly.\n');

    console.log('📋 OPTIONS TO GET DEVNET USDC:\n');
    console.log('1. Use the SPL Token Faucet:');
    console.log('   https://spl-token-faucet.com/?token-name=USDC-Dev\n');

    console.log('2. Use the Solana Faucet:');
    console.log('   https://faucet.solana.com/\n');

    console.log('3. Swap Devnet SOL for USDC on a devnet DEX\n');

    console.log('4. I can create a custom USDC-like token that we control:');
    console.log('   This would allow unlimited minting for testing purposes.\n');

    // Check if recipient has SOL for account rent
    const recipientBalance = await connection.getBalance(recipient);
    console.log(`\n💵 Recipient SOL balance: ${recipientBalance / 1e9} SOL`);

    if (recipientBalance === 0) {
      console.log('\n⚠️  Recipient needs SOL for account rent!');
      console.log('Run: solana airdrop 1 ' + recipientWallet + ' --url devnet');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const recipientWallet = process.argv[2] || process.env.RECIPIENT_WALLET || 'J3WmMHUixgfcUtL5ov4Cn6LE65cDybgAg7mc1PWGyVY';
const amount = parseFloat(process.argv[3] || process.env.AMOUNT || '10');

airdropUSDC(recipientWallet, amount);
