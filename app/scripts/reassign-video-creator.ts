/**
 * Script to reassign videos to the correct creator
 * Use this when videos were uploaded with the wrong wallet/JWT token
 *
 * Usage:
 * npx ts-node scripts/reassign-video-creator.ts <video-id> <correct-wallet-address>
 */

import { db } from '../server/database/db-factory';

async function reassignVideoCreator(videoId: string, correctWalletAddress: string) {
  try {
    console.log('\n🔄 Reassigning Video Creator');
    console.log('================================');
    console.log(`Video ID: ${videoId}`);
    console.log(`New Creator Wallet: ${correctWalletAddress}`);

    // Step 1: Get the video
    console.log('\n📹 Fetching video...');
    const video = await db.getVideoById(videoId);

    if (!video) {
      console.error('❌ Video not found!');
      process.exit(1);
    }

    console.log('✓ Video found:');
    console.log(`  Title: ${video.title}`);
    console.log(`  Current Creator Wallet: ${video.creatorWallet}`);
    console.log(`  Current Creator ID: ${video.creatorId}`);

    // Step 2: Get the correct creator user
    console.log('\n👤 Fetching correct creator user...');
    const correctUser = await db.getUserByWallet(correctWalletAddress);

    if (!correctUser) {
      console.error('❌ User not found with wallet:', correctWalletAddress);
      console.log('\nℹ️  Creating new user for this wallet...');

      // Auto-create user if they don't exist
      const newUser = await db.createUser({
        walletAddress: correctWalletAddress,
        isCreator: true,
      });

      console.log('✅ User created:');
      console.log(`  User ID: ${newUser.id}`);
      console.log(`  Wallet: ${newUser.walletAddress}`);
      console.log(`  Username: ${newUser.username || 'Not set'}`);

      // Update the video
      await updateVideo(videoId, newUser.id, newUser.walletAddress);
    } else {
      console.log('✓ User found:');
      console.log(`  User ID: ${correctUser.id}`);
      console.log(`  Wallet: ${correctUser.walletAddress}`);
      console.log(`  Username: ${correctUser.username || 'Not set'}`);

      // Ensure user is a creator
      if (!correctUser.isCreator) {
        console.log('📝 Upgrading user to creator...');
        await db.updateUser(correctUser.id, { isCreator: true });
        console.log('✓ User is now a creator');
      }

      // Update the video
      await updateVideo(videoId, correctUser.id, correctUser.walletAddress);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

async function updateVideo(videoId: string, creatorId: string, creatorWallet: string) {
  console.log('\n💾 Updating video in database...');

  await db.updateVideo(videoId, {
    creatorId,
    creatorWallet,
  });

  console.log('✅ Video updated successfully!');

  // Verify the update
  const updatedVideo = await db.getVideoById(videoId);
  console.log('\n✓ Verification:');
  console.log(`  Video ID: ${updatedVideo?.id}`);
  console.log(`  New Creator ID: ${updatedVideo?.creatorId}`);
  console.log(`  New Creator Wallet: ${updatedVideo?.creatorWallet}`);

  console.log('\n✅ Done! Video has been reassigned to the correct creator.');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('\n❌ Usage: npx ts-node scripts/reassign-video-creator.ts <video-id> <correct-wallet-address>');
  console.error('\nExample:');
  console.error('  npx ts-node scripts/reassign-video-creator.ts video_1762039697837_5ajsoc J3WmMHUiMx...');
  process.exit(1);
}

const [videoId, walletAddress] = args;

// Run the script
reassignVideoCreator(videoId, walletAddress)
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
