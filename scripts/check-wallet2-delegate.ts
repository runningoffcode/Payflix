/**
 * Simple check of Wallet 2 delegate approval on blockchain
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const RPC_URL = 'https://api.devnet.solana.com';

async function checkDelegate() {
  console.log('\n🔍 Checking Wallet 2 Delegate Approval on Blockchain\n');
  console.log('═'.repeat(70));
  console.log(`Wallet: ${WALLET_2}`);
  console.log('═'.repeat(70));

  const connection = new Connection(RPC_URL, 'confirmed');

  try {
    // Get user's USDC token account
    console.log('\n💰 Getting USDC token account...');
    const userPublicKey = new PublicKey(WALLET_2);
    const userUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      userPublicKey
    );

    console.log(`✅ USDC Token Account: ${userUsdcAccount.toBase58()}`);

    // Check account info on blockchain
    console.log('\n🔗 Fetching account info from blockchain...');
    const accountInfo = await getAccount(connection, userUsdcAccount);

    console.log('\n📊 Account Details:');
    console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
    console.log(`   Balance: ${Number(accountInfo.amount) / 1_000_000} USDC`);
    console.log(`   Delegate: ${accountInfo.delegate ? accountInfo.delegate.toBase58() : 'None ❌'}`);
    console.log(`   Delegated Amount: ${accountInfo.delegatedAmount ? Number(accountInfo.delegatedAmount) / 1_000_000 + ' USDC' : 'None ❌'}`);

    if (!accountInfo.delegate) {
      console.log('\n❌ PROBLEM FOUND: No delegate is set!');
      console.log('\n💡 Solution:');
      console.log('   1. The user needs to REFRESH the page');
      console.log('   2. The SessionCreationModal should detect the invalid session');
      console.log('   3. User should create a NEW session by depositing again');
      console.log('   4. This time the approval transaction will set the delegate');
      console.log('\n📝 Note: The session exists in the database but the blockchain');
      console.log('         approval is missing. This can happen if:');
      console.log('         - The approval transaction failed');
      console.log('         - The session was created incorrectly');
      console.log('         - The delegate approval expired (unlikely)');
    } else {
      const delegatedAmountUsdc = Number(accountInfo.delegatedAmount || 0n) / 1_000_000;

      if (delegatedAmountUsdc === 0) {
        console.log('\n❌ PROBLEM FOUND: Delegate is set but has 0 spending limit!');
        console.log('\n💡 Solution: User needs to re-approve with a proper spending limit');
      } else {
        console.log('\n✅ Delegate is properly set up!');
        console.log(`   Delegate Address: ${accountInfo.delegate.toBase58()}`);
        console.log(`   Spending Limit: ${delegatedAmountUsdc} USDC`);
        console.log('\n   If payment still fails, the session key in the database');
        console.log('   might not match this delegate address.');
      }
    }

    console.log('\n' + '═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('could not find account')) {
      console.log('\n💡 The wallet does not have a USDC token account.');
      console.log('   User needs to receive some USDC first.');
    }
  }
}

// Run the check
checkDelegate();
