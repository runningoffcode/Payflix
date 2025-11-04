/**
 * Fix Wallet 2 Session
 * Deletes the invalid session via API so a new one can be created
 */

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';
const API_URL = 'http://localhost:5001';

async function fixSession() {
  console.log('\n🔧 Fixing Wallet 2 Session\n');
  console.log('═'.repeat(60));
  console.log(`Wallet: ${WALLET_2}`);
  console.log('═'.repeat(60));

  try {
    // Step 1: Check current session
    console.log('\n📊 Step 1: Checking current session...');
    const balanceResponse = await fetch(
      `${API_URL}/api/payments/session/balance?userWallet=${WALLET_2}`
    );

    if (!balanceResponse.ok) {
      throw new Error('Failed to check balance');
    }

    const balanceData = await balanceResponse.json();

    if (!balanceData.hasSession) {
      console.log('✅ No session found - nothing to fix!');
      console.log('\n💡 You can now create a new session:');
      console.log('   1. Refresh your browser');
      console.log('   2. Deposit modal should appear');
      console.log('   3. Create a session');
      return;
    }

    console.log('📊 Current session:');
    console.log(`   Balance: $${balanceData.remainingAmount} USDC`);

    // Step 2: Withdraw all funds (this will close the session)
    console.log('\n🗑️  Step 2: Closing invalid session...');
    const withdrawResponse = await fetch(`${API_URL}/api/sessions/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userWallet: WALLET_2,
        // No amount = withdraw all = close session
      }),
    });

    if (!withdrawResponse.ok) {
      const errorData = await withdrawResponse.json();
      throw new Error(errorData.message || 'Failed to close session');
    }

    const withdrawData = await withdrawResponse.json();

    console.log('✅ Session closed successfully!');
    console.log(`   Withdrawn: $${withdrawData.withdrawnAmount} USDC`);

    console.log('\n💡 Next Steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. The deposit modal should appear automatically');
    console.log('   3. Create a NEW session by depositing USDC');
    console.log('   4. Sign the approval transaction when prompted');
    console.log('   5. The delegate will be properly set this time!');
    console.log('   6. Try paying for the video - it should work! 🎉');

    console.log('\n' + '═'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the fix
fixSession();
