/**
 * Fund Facilitator Wallet with Test USDC
 * The facilitator needs USDC to process seamless payments on behalf of users
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getMint } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

async function checkFacilitatorBalance() {
  try {
    console.log('\n💰 Checking Facilitator Wallet Balance...\n');

    // Load facilitator wallet
    const privateKeyStr = process.env.PLATFORM_WALLET_PRIVATE_KEY;
    if (!privateKeyStr || privateKeyStr === 'your_platform_wallet_private_key_here') {
      console.error('❌ PLATFORM_WALLET_PRIVATE_KEY not configured in .env');
      process.exit(1);
    }

    const keyData = JSON.parse(privateKeyStr);
    const facilitatorWallet = Keypair.fromSecretKey(new Uint8Array(keyData));

    console.log(`Facilitator Wallet: ${facilitatorWallet.publicKey.toBase58()}\n`);

    // Check SOL balance
    const solBalance = await connection.getBalance(facilitatorWallet.publicKey);
    console.log(`SOL Balance: ${solBalance / 1e9} SOL`);

    // Check USDC balance
    try {
      const usdcTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        facilitatorWallet.publicKey
      );

      console.log(`USDC Token Account: ${usdcTokenAccount.toBase58()}`);

      const tokenBalance = await connection.getTokenAccountBalance(usdcTokenAccount);
      const usdcAmount = parseFloat(tokenBalance.value.uiAmount?.toString() || '0');

      console.log(`USDC Balance: ${usdcAmount} USDC\n`);

      if (usdcAmount === 0) {
        console.log('⚠️  Facilitator has 0 USDC - cannot process payments!');
        console.log('\n📋 To fund the facilitator wallet:');
        console.log('\n1. Use SPL Token Faucet:');
        console.log('   → https://spl-token-faucet.com/');
        console.log('   → Select "USDC" and "Devnet"');
        console.log(`   → Enter: ${facilitatorWallet.publicKey.toBase58()}`);
        console.log('   → Click "Get Tokens"');
        console.log('\n2. Or transfer from another wallet:');
        console.log(`   → Send Devnet USDC to: ${facilitatorWallet.publicKey.toBase58()}`);
        console.log('\n💡 The facilitator needs USDC to process seamless payments on behalf of users.\n');
      } else if (usdcAmount < 100) {
        console.log(`⚠️  Low balance: ${usdcAmount} USDC`);
        console.log('   Consider adding more USDC for testing\n');
      } else {
        console.log(`✅ Facilitator has enough USDC for testing!\n`);

        // Estimate how many video payments can be processed
        const avgVideoPrice = 3.5; // Average USDC
        const estimatedPayments = Math.floor(usdcAmount / avgVideoPrice);
        console.log(`📊 Can process approximately ${estimatedPayments} video payments\n`);
      }

    } catch (error: any) {
      if (error.message.includes('could not find account')) {
        console.log('USDC Token Account: Not created yet');
        console.log('USDC Balance: 0 USDC (account doesn\'t exist)\n');
        console.log('⚠️  The USDC token account will be created automatically when receiving USDC.\n');
        console.log('📋 To fund the facilitator:');
        console.log(`   Use https://spl-token-faucet.com/ and send to: ${facilitatorWallet.publicKey.toBase58()}\n`);
      } else {
        throw error;
      }
    }

    console.log('✅ Balance check complete!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFacilitatorBalance();
