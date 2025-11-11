/**
 * Airdrop Devnet SOL and USDC to wallet
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const USER_WALLET = 'J3WmMHUixgfcUtL5ov4Cn6LE65cDybgAg7mc1PWGyVY';
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function airdropTokens() {
  try {
    const userPublicKey = new PublicKey(USER_WALLET);

    console.log(`🪂 Airdropping tokens to: ${USER_WALLET}\n`);

    // 1. Airdrop SOL
    console.log('1️⃣  Requesting Devnet SOL...');
    try {
      const solSignature = await connection.requestAirdrop(
        userPublicKey,
        2 * LAMPORTS_PER_SOL
      );

      console.log('   Waiting for confirmation...');
      await connection.confirmTransaction(solSignature);

      const balance = await connection.getBalance(userPublicKey);
      console.log(`   ✅ Airdropped 2 SOL!`);
      console.log(`   Current balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);
    } catch (error: any) {
      if (error.message?.includes('airdrop request limit')) {
        console.log('   ⚠️  Airdrop limit reached. Checking current balance...');
        const balance = await connection.getBalance(userPublicKey);
        console.log(`   Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);
        if (balance < LAMPORTS_PER_SOL) {
          console.log('   💡 Wait a few minutes and try again, or use https://faucet.solana.com\n');
        } else {
          console.log('   ✅ You have enough SOL for transactions\n');
        }
      } else {
        throw error;
      }
    }

    // 2. Check/Create USDC Token Account
    console.log('2️⃣  Checking USDC token account...');
    const userUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      userPublicKey
    );
    console.log(`   Token account: ${userUsdcAccount.toBase58()}`);

    const accountInfo = await connection.getAccountInfo(userUsdcAccount);
    if (!accountInfo) {
      console.log('   ℹ️  USDC token account does not exist yet');
      console.log('   It will be created automatically on first payment\n');
    } else {
      console.log('   ✅ USDC token account exists\n');
    }

    // 3. Instructions for getting USDC
    console.log('3️⃣  To get Devnet USDC:');
    console.log('   Option 1: Use SPL Token Faucet');
    console.log('   → https://spl-token-faucet.com/');
    console.log('   → Select "USDC" and "Devnet"');
    console.log(`   → Enter: ${USER_WALLET}`);
    console.log('   → Click "Get Tokens"\n');

    console.log('   Option 2: Use QuickNode Faucet');
    console.log('   → https://faucet.quicknode.com/solana/devnet');
    console.log(`   → Enter: ${USER_WALLET}`);
    console.log('   → Request tokens\n');

    console.log('   Option 3: I can create test USDC for you');
    console.log('   → This requires the facilitator wallet to have USDC');
    console.log('   → The facilitator can transfer you test USDC\n');

    console.log('✅ Setup complete!');
    console.log(`\n💡 After getting USDC, try the payment again!`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

airdropTokens();
