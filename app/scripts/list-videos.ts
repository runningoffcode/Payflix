/**
 * Script to list all videos with their creator information
 * Useful for identifying videos that need reassignment
 *
 * Usage:
 * npx ts-node scripts/list-videos.ts [wallet-address]
 *
 * If wallet address is provided, only shows videos from that creator
 */

import { db } from '../server/database/db-factory';

async function listVideos(filterWallet?: string) {
  try {
    console.log('\n📹 Fetching all videos...\n');

    // Get all videos
    const videos = await db.getAllVideos();

    if (videos.length === 0) {
      console.log('ℹ️  No videos found in database');
      return;
    }

    console.log(`Found ${videos.length} total video(s)\n`);

    // Filter by wallet if provided
    const filteredVideos = filterWallet
      ? videos.filter((v: any) => v.creatorWallet === filterWallet)
      : videos;

    if (filteredVideos.length === 0) {
      console.log(`ℹ️  No videos found for wallet: ${filterWallet}`);
      return;
    }

    console.log(`Showing ${filteredVideos.length} video(s)${filterWallet ? ` for wallet ${filterWallet}` : ''}\n`);
    console.log('='.repeat(100));

    // Group videos by creator
    const videosByCreator = filteredVideos.reduce((acc: any, video: any) => {
      if (!acc[video.creatorWallet]) {
        acc[video.creatorWallet] = [];
      }
      acc[video.creatorWallet].push(video);
      return acc;
    }, {});

    // Display videos grouped by creator
    for (const [creatorWallet, creatorVideos] of Object.entries(videosByCreator)) {
      const videos = creatorVideos as any[];
      const firstVideo = videos[0];

      // Get creator info
      const creator = await db.getUserByWallet(creatorWallet);

      console.log('\n👤 CREATOR:');
      console.log(`   Username: ${creator?.username || 'Not set'}`);
      console.log(`   Wallet: ${creatorWallet}`);
      console.log(`   User ID: ${creator?.id || 'Unknown'}`);
      console.log(`   Videos: ${videos.length}`);
      console.log('\n   📹 VIDEOS:');

      videos.forEach((video: any, index: number) => {
        console.log(`\n   ${index + 1}. ${video.title}`);
        console.log(`      Video ID: ${video.id}`);
        console.log(`      Price: $${video.priceUsdc} USDC`);
        console.log(`      Views: ${video.views}`);
        console.log(`      Earnings: $${video.earnings} USDC`);
        console.log(`      Created: ${new Date(video.createdAt).toLocaleString()}`);
      });

      console.log('\n' + '-'.repeat(100));
    }

    console.log('\n✅ Done!\n');

    // Show reassignment command example
    if (filteredVideos.length > 0) {
      const firstVideo = filteredVideos[0];
      console.log('💡 To reassign a video to a different creator:');
      console.log(`   npx ts-node scripts/reassign-video-creator.ts ${firstVideo.id} <correct-wallet-address>`);
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const filterWallet = args[0] || undefined;

// Run the script
listVideos(filterWallet)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
