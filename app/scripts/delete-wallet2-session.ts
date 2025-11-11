/**
 * Delete Wallet 2's Session
 */

import { db } from '../server/database/db-factory.js';

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';

async function deleteSession() {
  console.log('\n🗑️  Deleting Wallet 2 Session\n');
  console.log('═'.repeat(70));
  console.log(`Wallet: ${WALLET_2}`);
  console.log('═'.repeat(70));

  try {
    // Check if session exists
    const session = await db.getActiveSession(WALLET_2);

    if (!session) {
      console.log('\n✅ No session found - nothing to delete!');
      return;
    }

    console.log(`\n📊 Found session:`);
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Approved: $${session.approved_amount} USDC`);
    console.log(`   Remaining: $${session.remaining_amount} USDC`);

    // Delete the session
    console.log('\n🗑️  Revoking session...');

    await db.revokeSession(session.id);

    console.log('✅ Session deleted successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh the browser');
    console.log('   2. Sign in with Wallet 2');
    console.log('   3. The deposit modal will appear');
    console.log('   4. Create a new session with the correct mint');
    console.log('\n' + '═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run
deleteSession();
