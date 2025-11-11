/**
 * Diagnostic script to check payment session state
 * Run with: npx ts-node scripts/diagnose-payment-issue.ts <USER_WALLET_ADDRESS>
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { db } from '../server/database/db-factory.js';

const USER_WALLET = process.argv[2];

if (!USER_WALLET) {
  console.error('❌ Usage: npx ts-node scripts/diagnose-payment-issue.ts <USER_WALLET_ADDRESS>');
  process.exit(1);
}

async function diagnose() {
  try {
    console.log('\n🔍 PAYMENT ISSUE DIAGNOSTIC');
    console.log('============================================================');
    console.log(`\n📍 User wallet: ${USER_WALLET}\n`);

    // Setup connection
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    const usdcMint = new PublicKey(
      process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    );

    // 1. Check facilitator wallet SOL balance
    console.log('1️⃣ FACILITATOR WALLET CHECK');
    console.log('------------------------------------------------------------');

    if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
      const { Keypair } = await import('@solana/web3.js');
      const keyData = JSON.parse(process.env.PLATFORM_WALLET_PRIVATE_KEY);
      const facilitatorKeypair = Keypair.fromSecretKey(new Uint8Array(keyData));
      const facilitatorBalance = await connection.getBalance(facilitatorKeypair.publicKey);

      console.log(`   Address: ${facilitatorKeypair.publicKey.toBase58()}`);
      console.log(`   SOL Balance: ${(facilitatorBalance / 1e9).toFixed(4)} SOL`);

      if (facilitatorBalance < 0.01 * 1e9) {
        console.log(`   ⚠️  WARNING: Low SOL balance! Need at least 0.01 SOL for gas fees`);
      } else {
        console.log(`   ✅ Sufficient SOL for gas fees`);
      }
    } else {
      console.log(`   ❌ PLATFORM_WALLET_PRIVATE_KEY not configured!`);
    }

    // 2. Check user's USDC token account
    console.log(`\n2️⃣ USER USDC TOKEN ACCOUNT CHECK`);
    console.log('------------------------------------------------------------');

    const userPublicKey = new PublicKey(USER_WALLET);
    const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, userPublicKey);

    console.log(`   USDC Account: ${userUsdcAccount.toBase58()}`);

    try {
      const accountInfo = await getAccount(connection, userUsdcAccount);

      console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
      console.log(`   Balance: ${(Number(accountInfo.amount) / 1e6).toFixed(6)} USDC`);
      console.log(`   Delegate: ${accountInfo.delegate ? accountInfo.delegate.toBase58() : 'None'}`);
      console.log(`   Delegated Amount: ${accountInfo.delegatedAmount ? (Number(accountInfo.delegatedAmount) / 1e6).toFixed(6) + ' USDC' : 'None'}`);

      if (!accountInfo.delegate) {
        console.log(`   ⚠️  WARNING: No delegate set! Session key cannot transfer tokens.`);
      } else {
        console.log(`   ✅ Delegate is set`);
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      console.log(`   Token account may not exist!`);
    }

    // 3. Check database session
    console.log(`\n3️⃣ DATABASE SESSION CHECK`);
    console.log('------------------------------------------------------------');

    const session = await db.getActiveSession(USER_WALLET);

    if (!session) {
      console.log(`   ❌ No active session found in database`);
    } else {
      console.log(`   Session ID: ${session.id}`);
      console.log(`   Session Key: ${session.session_public_key}`);
      console.log(`   Approved Amount: ${session.approved_amount} USDC`);
      console.log(`   Spent Amount: ${session.spent_amount} USDC`);
      console.log(`   Remaining Amount: ${session.remaining_amount} USDC`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Expires: ${session.expires_at}`);
      console.log(`   Approval Signature: ${session.approval_signature}`);

      // 4. Verify the approval transaction on-chain
      console.log(`\n4️⃣ APPROVAL TRANSACTION VERIFICATION`);
      console.log('------------------------------------------------------------');

      try {
        const txInfo = await connection.getTransaction(session.approval_signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!txInfo) {
          console.log(`   ❌ Approval transaction not found on-chain!`);
          console.log(`   This means the delegate was never set.`);
        } else if (txInfo.meta?.err) {
          console.log(`   ❌ Approval transaction FAILED on-chain!`);
          console.log(`   Error: ${JSON.stringify(txInfo.meta.err)}`);
        } else {
          console.log(`   ✅ Approval transaction confirmed on-chain`);
          console.log(`   Slot: ${txInfo.slot}`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not fetch transaction: ${error.message}`);
      }
    }

    // 5. Summary and recommendations
    console.log(`\n5️⃣ DIAGNOSIS SUMMARY`);
    console.log('============================================================');

    const accountInfo = await getAccount(connection, userUsdcAccount).catch(() => null);

    if (!accountInfo) {
      console.log(`\n❌ CRITICAL: User's USDC token account doesn't exist`);
      console.log(`   → User needs to add USDC to their wallet first`);
    } else if (!accountInfo.delegate) {
      console.log(`\n❌ CRITICAL: No delegate approval set on user's USDC account`);
      console.log(`   → The session creation/approval transaction either:`);
      console.log(`      1. Was never broadcast`);
      console.log(`      2. Failed on-chain`);
      console.log(`      3. Was revoked manually by the user`);
      console.log(`   → User needs to create a new session to set delegate approval`);
    } else if (session && accountInfo.delegate.toBase58() !== session.session_public_key) {
      console.log(`\n❌ CRITICAL: Delegate mismatch!`);
      console.log(`   Database session key: ${session.session_public_key}`);
      console.log(`   On-chain delegate: ${accountInfo.delegate.toBase58()}`);
      console.log(`   → Session key in database doesn't match on-chain delegate`);
    } else if (accountInfo.delegatedAmount && Number(accountInfo.delegatedAmount) === 0) {
      console.log(`\n❌ CRITICAL: Delegate approval is exhausted (0 USDC remaining)`);
      console.log(`   → User needs to top up their session to refresh the delegate approval`);
    } else {
      console.log(`\n✅ On-chain state looks correct!`);
      console.log(`   Delegate: ${accountInfo.delegate?.toBase58()}`);
      console.log(`   Delegated amount: ${accountInfo.delegatedAmount ? (Number(accountInfo.delegatedAmount) / 1e6).toFixed(6) + ' USDC' : 'None'}`);
      console.log(`   → The issue might be with the facilitator wallet or transaction construction`);
    }

    console.log('\n============================================================\n');
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Diagnostic failed:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

diagnose();
