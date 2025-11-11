/**
 * Test Seamless Payment for Wallet 2
 * This script tests if wallet 2 can successfully pay for a video using X402
 */

const WALLET_2 = '7GjoGMVuup81ihWRvboTpwiXPgu5vPnmzCEZ66uWN5yu';
const VIDEO_ID = 'video_1761981238475_2yikda'; // Hello World video
const API_URL = 'http://localhost:5001';

async function testSeamlessPayment() {
  console.log('\n🧪 Testing X402 Seamless Payment Flow\n');
  console.log('═'.repeat(60));
  console.log(`Wallet: ${WALLET_2}`);
  console.log(`Video:  ${VIDEO_ID}`);
  console.log('═'.repeat(60));

  // Step 1: Check session balance
  console.log('\n📊 Step 1: Checking session balance...');
  try {
    const balanceResponse = await fetch(
      `${API_URL}/api/payments/session/balance?userWallet=${WALLET_2}`
    );

    if (!balanceResponse.ok) {
      throw new Error(`Failed to check balance: ${balanceResponse.statusText}`);
    }

    const balanceData = await balanceResponse.json();
    console.log('✅ Session found!');
    console.log(`   Approved:  $${balanceData.approvedAmount} USDC`);
    console.log(`   Spent:     $${balanceData.spentAmount} USDC`);
    console.log(`   Remaining: $${balanceData.remainingAmount} USDC`);

    if (!balanceData.hasSession) {
      console.log('\n❌ ERROR: No session found for this wallet');
      console.log('   Please deposit USDC first via the UI');
      return;
    }

    // Step 2: Get video details
    console.log('\n📹 Step 2: Fetching video details...');
    const videoResponse = await fetch(`${API_URL}/api/videos/${VIDEO_ID}`);

    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }

    const video = await videoResponse.json();
    console.log(`✅ Video found: "${video.title}"`);
    console.log(`   Price: $${video.priceUsdc} USDC`);
    console.log(`   Creator: ${video.creatorWallet.substring(0, 8)}...`);

    // Step 3: Check if balance is sufficient
    console.log('\n💰 Step 3: Checking if balance is sufficient...');
    if (balanceData.remainingAmount < video.priceUsdc) {
      console.log('❌ ERROR: Insufficient balance');
      console.log(`   Need: $${video.priceUsdc} USDC`);
      console.log(`   Have: $${balanceData.remainingAmount} USDC`);
      return;
    }
    console.log('✅ Balance is sufficient!');

    // Step 4: Test seamless payment
    console.log('\n💸 Step 4: Testing seamless payment...');
    console.log('   Sending payment request...');

    const paymentResponse = await fetch(`${API_URL}/api/payments/seamless`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: VIDEO_ID,
        userWallet: WALLET_2,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.log('\n❌ Payment FAILED');
      console.log(`   Status: ${paymentResponse.status}`);
      console.log(`   Error: ${paymentData.error}`);
      console.log(`   Message: ${paymentData.message}`);

      if (paymentData.requiresSession) {
        console.log('\n💡 Tip: Create a session first by depositing USDC');
      } else if (paymentData.requiresTopUp) {
        console.log('\n💡 Tip: Top up your session balance');
      }
      return;
    }

    if (paymentData.alreadyPaid) {
      console.log('\n✅ Payment ALREADY COMPLETE');
      console.log('   You already have access to this video!');
      console.log(`   Original tx: ${paymentData.signature}`);
      return;
    }

    console.log('\n✅ Payment SUCCESS!');
    console.log(`   Transaction: ${paymentData.signature}`);
    console.log(`   Amount: $${paymentData.payment.amount} USDC`);
    console.log('\n🎬 Video access granted! The X402 flow works perfectly!');
    console.log('═'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Test FAILED with error:', error.message);
  }
}

// Run the test
testSeamlessPayment();
