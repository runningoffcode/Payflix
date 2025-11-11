/**
 * Check Wallet 2 USDC Balance for the CORRECT Mint
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';
const CORRECT_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const RPC_URL = 'https://api.devnet.solana.com';

async function checkBalance() {
  console.log('\n🔍 Checking Wallet 2 USDC Balance\n');
  console.log('═'.repeat(70));
  console.log(`Wallet: ${WALLET_2}`);
  console.log(`USDC Mint: ${CORRECT_USDC_MINT.toBase58()}`);
  console.log('═'.repeat(70));

  const connection = new Connection(RPC_URL, 'confirmed');

  try {
    // Check SOL balance
    const userPublicKey = new PublicKey(WALLET_2);
    const solBalance = await connection.getBalance(userPublicKey);
    console.log(`\n💰 SOL Balance: ${solBalance / 1e9} SOL`);

    // Get USDC token account for the CORRECT mint
    const userUsdcAccount = await getAssociatedTokenAddress(
      CORRECT_USDC_MINT,
      userPublicKey
    );

    console.log(`\n💵 USDC Token Account: ${userUsdcAccount.toBase58()}`);

    // Check if account exists
    const accountInfo = await connection.getAccountInfo(userUsdcAccount);

    if (!accountInfo) {
      console.log('\n❌ PROBLEM: No USDC token account found for this mint!');
      console.log('\n💡 SOLUTION: You need to mint test USDC to this wallet');
      console.log('   Run this command:');
      console.log(`   npx ts-node scripts/mint-test-usdc.ts ${WALLET_2} 50`);
      return;
    }

    // Get balance
    const balance = await connection.getTokenAccountBalance(userUsdcAccount);
    const usdcAmount = parseFloat(balance.value.uiAmountString || '0');

    console.log(`✅ USDC Balance: ${usdcAmount} USDC`);

    if (usdcAmount === 0) {
      console.log('\n⚠️  Balance is 0 USDC!');
      console.log('\n💡 SOLUTION: Mint some test USDC to this wallet');
      console.log('   Run this command:');
      console.log(`   npx ts-node scripts/mint-test-usdc.ts ${WALLET_2} 50`);
    } else if (usdcAmount < 1) {
      console.log('\n⚠️  Balance is very low!');
      console.log('   Consider minting more USDC for testing');
    } else {
      console.log('\n✅ Wallet has sufficient USDC for testing!');
    }

    console.log('\n' + '═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the check
checkBalance();
