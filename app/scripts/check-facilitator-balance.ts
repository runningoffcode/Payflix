/**
 * Check Facilitator Wallet Balance
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const FACILITATOR = '39EjpiWi3x1qso9gfDdx8hdt8TeY7zoEqLHaxtajYdBH';
const RPC_URL = 'https://api.devnet.solana.com';

async function checkBalance() {
  console.log('\n🔍 Checking Facilitator Wallet Balance\n');
  console.log('═'.repeat(70));
  console.log(`Facilitator: ${FACILITATOR}`);
  console.log('═'.repeat(70));

  const connection = new Connection(RPC_URL, 'confirmed');
  const publicKey = new PublicKey(FACILITATOR);

  try {
    // Check SOL balance
    const solBalance = await connection.getBalance(publicKey);
    console.log(`\n💰 SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

    if (solBalance === 0) {
      console.log('\n❌ CRITICAL: Facilitator has 0 SOL!');
      console.log('   The facilitator pays for transaction fees.');
      console.log('   Without SOL, NO transactions can be processed!');
      console.log('\n💡 SOLUTION: Fund the facilitator wallet with SOL');
      console.log('   Option 1: Use the web faucet');
      console.log('   Option 2: Transfer SOL from another wallet');
    } else if (solBalance / LAMPORTS_PER_SOL < 0.1) {
      console.log('\n⚠️  WARNING: Facilitator balance is very low!');
      console.log('   Consider adding more SOL to ensure smooth operation.');
    } else {
      console.log('\n✅ Facilitator has sufficient SOL for fees!');
    }

    console.log('\n' + '═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run
checkBalance();
