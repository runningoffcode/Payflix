/**
 * Delete Invalid Session for Wallet 2
 * This removes the broken session so a new one can be created
 */

import { db } from '../server/database/db-factory.js';

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';

async function deleteInvalidSession() {
  console.log('\n🗑️  Deleting Invalid Session\n');
  console.log('═'.repeat(60));
  console.log(`Wallet: ${WALLET_2}`);
  console.log('═'.repeat(60));

  try {
    // Get the session
    const session = await db.getActiveSession(WALLET_2);

    if (!session) {
      console.log('\n✅ No session found - nothing to delete');
      return;
    }

    console.log('\n📊 Found session:');
    console.log(`   ID: ${session.id}`);
    console.log(`   Balance: $${session.remaining_amount} USDC`);
    console.log(`   Session Wallet: ${session.session_wallet}`);

    // Delete it
    console.log('\n🗑️  Deleting session...');
    const success = await db.revokeSession(session.id);

    if (success) {
      console.log('✅ Session deleted successfully!');
      console.log('\n💡 Next steps:');
      console.log('   1. Refresh your browser');
      console.log('   2. The deposit modal should appear');
      console.log('   3. Create a NEW session');
      console.log('   4. This time the delegate will be properly set!');
    } else {
      console.log('❌ Failed to delete session');
    }

    console.log('\n' + '═'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the deletion
deleteInvalidSession();
