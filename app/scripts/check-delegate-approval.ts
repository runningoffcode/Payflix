/**
 * Check Delegate Approval for Session Key
 * Verifies if the session key is properly approved on the blockchain
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { db } from '../server/database/db-factory.js';

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function checkDelegateApproval() {
  console.log('\n🔍 Checking Delegate Approval\n');
  console.log('═'.repeat(70));
  console.log(`Wallet: ${WALLET_2}`);
  console.log(`USDC Mint: ${USDC_MINT.toBase58()}`);
  console.log('═'.repeat(70));

  const connection = new Connection(RPC_URL, 'confirmed');

  try {
    // Step 1: Get session from database
    console.log('\n📊 Step 1: Fetching session from database...');
    const session = await db.getActiveSession(WALLET_2);

    if (!session) {
      console.log('❌ No active session found in database!');
      return;
    }

    console.log('✅ Session found in database:');
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Session Wallet: ${session.session_wallet}`);
    console.log(`   Approved Amount: $${session.approved_amount} USDC`);
    console.log(`   Remaining: $${session.remaining_amount} USDC`);

    // Step 2: Get user's USDC token account
    console.log('\n💰 Step 2: Getting user USDC token account...');
    const userPublicKey = new PublicKey(WALLET_2);
    const userUsdcAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      userPublicKey
    );

    console.log(`✅ User USDC Account: ${userUsdcAccount.toBase58()}`);

    // Step 3: Check account info on blockchain
    console.log('\n🔗 Step 3: Checking account info on blockchain...');
    const accountInfo = await getAccount(connection, userUsdcAccount);

    console.log('✅ Account found on blockchain:');
    console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
    console.log(`   Balance: ${Number(accountInfo.amount) / 1_000_000} USDC`);
    console.log(`   Delegate: ${accountInfo.delegate ? accountInfo.delegate.toBase58() : 'None'}`);
    console.log(`   Delegated Amount: ${accountInfo.delegatedAmount ? Number(accountInfo.delegatedAmount) / 1_000_000 + ' USDC' : 'None'}`);

    // Step 4: Compare delegate with session wallet
    console.log('\n🔍 Step 4: Comparing delegate with session wallet...');

    if (!accountInfo.delegate) {
      console.log('❌ ERROR: No delegate is set on the USDC token account!');
      console.log('\n💡 Solution: The user needs to re-create their session');
      console.log('   1. Refresh the page');
      console.log('   2. The deposit modal should appear');
      console.log('   3. Sign the approval transaction');
      console.log('   4. The session key will be properly delegated');
      return;
    }

    const sessionWallet = session.session_wallet;
    const blockchainDelegate = accountInfo.delegate.toBase58();

    if (blockchainDelegate === sessionWallet) {
      console.log('✅ MATCH! Delegate is correctly set up!');
      console.log(`   Session Wallet: ${sessionWallet}`);
      console.log(`   Blockchain Delegate: ${blockchainDelegate}`);

      const delegatedAmountUsdc = Number(accountInfo.delegatedAmount || 0n) / 1_000_000;
      console.log(`   Delegated Amount: ${delegatedAmountUsdc} USDC`);

      if (delegatedAmountUsdc === 0) {
        console.log('\n❌ ERROR: Delegated amount is 0!');
        console.log('   The delegate is set but has no spending limit.');
        console.log('   User needs to re-approve with a spending limit.');
      } else {
        console.log('\n✅ Everything looks good! Payment should work.');
        console.log('   If payment still fails, check if the session private key');
        console.log('   in the database matches the delegate on chain.');
      }
    } else {
      console.log('❌ MISMATCH! Delegate does not match session wallet!');
      console.log(`   Database Session Wallet: ${sessionWallet}`);
      console.log(`   Blockchain Delegate:     ${blockchainDelegate}`);
      console.log('\n💡 Solution: User needs to create a new session');
      console.log('   The old session key is no longer valid.');
    }

    console.log('\n' + '═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the check
checkDelegateApproval();
