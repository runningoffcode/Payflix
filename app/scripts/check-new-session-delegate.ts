/**
 * Check if NEW Session's Delegate Approval is Set
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';
const SESSION_KEY = '5LRfMjUgtM5G5oUbumNKF3V8c5b8ZYzDqDjFEi45htGN'; // From logs
const CORRECT_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const RPC_URL = 'https://api.devnet.solana.com';

async function checkDelegate() {
  console.log('\n🔍 Checking NEW Session Delegate Approval\n');
  console.log('═'.repeat(70));
  console.log(`Wallet: ${WALLET_2}`);
  console.log(`Session Key: ${SESSION_KEY}`);
  console.log(`USDC Mint: ${CORRECT_USDC_MINT.toBase58()}`);
  console.log('═'.repeat(70));

  const connection = new Connection(RPC_URL, 'confirmed');

  try {
    // Get user's USDC token account
    const userPublicKey = new PublicKey(WALLET_2);
    const userUsdcAccount = await getAssociatedTokenAddress(
      CORRECT_USDC_MINT,
      userPublicKey
    );

    console.log(`\n💵 USDC Token Account: ${userUsdcAccount.toBase58()}`);

    // Check account info on blockchain
    const accountInfo = await getAccount(connection, userUsdcAccount);

    console.log('\n📊 Account Details:');
    console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
    console.log(`   Balance: ${Number(accountInfo.amount) / 1_000_000} USDC`);
    console.log(`   Delegate: ${accountInfo.delegate ? accountInfo.delegate.toBase58() : 'None ❌'}  `);
    console.log(`   Delegated Amount: ${accountInfo.delegatedAmount ? Number(accountInfo.delegatedAmount) / 1_000_000 + ' USDC' : 'None ❌'}`);

    if (!accountInfo.delegate) {
      console.log('\n❌ CRITICAL PROBLEM: No delegate is set!');
      console.log('\n💡 This means the approval transaction was NOT broadcast to blockchain.');
      console.log('   The session confirmation endpoint is not working properly.');
      console.log('\n🔧 DIAGNOSIS:');
      console.log('   The session exists in database but delegate approval is missing.');
      console.log('   This proves the transaction broadcast fix is not working.');
    } else if (accountInfo.delegate.toBase58() !== SESSION_KEY) {
      console.log('\n❌ MISMATCH: Wrong delegate!');
      console.log(`   Expected: ${SESSION_KEY}`);
      console.log(`   Got:      ${accountInfo.delegate.toBase58()}`);
    } else {
      const delegatedAmountUsdc = Number(accountInfo.delegatedAmount || 0n) / 1_000_000;

      console.log('\n✅ Delegate is properly set!');
      console.log(`   Delegate matches session key: ${SESSION_KEY}`);
      console.log(`   Spending limit: ${delegatedAmountUsdc} USDC`);

      if (delegatedAmountUsdc === 0) {
        console.log('\n⚠️  But delegated amount is 0 USDC!');
        console.log('   This would prevent payments from working.');
      } else {
        console.log('\n✅ Everything looks perfect!');
        console.log('   If payment still fails, check server logs for more details.');
      }
    }

    console.log('\n' + '═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('could not find account')) {
      console.log('\n💡 The wallet does not have a USDC token account for this mint.');
      console.log('   Wallet needs to receive USDC from this mint first.');
    }
  }
}

// Run
checkDelegate();
