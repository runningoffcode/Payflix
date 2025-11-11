import { r2StorageService } from '../server/services/r2-storage.service';
import { db } from '../server/database/db-factory';

async function checkR2Videos() {
  console.log('🔍 Checking R2 video files...\n');

  try {
    // Get all videos from database
    const videos = await db.getAllVideos();
    console.log(`📊 Found ${videos.length} videos in database\n`);

    for (const video of videos) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📹 Video: ${video.title}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   Video Path: ${video.videoPath || 'NOT SET'}`);
      console.log(`   Video URL: ${video.videoUrl || 'NOT SET'}`);

      if (!video.videoPath) {
        console.log(`   ❌ No videoPath set in database`);
        continue;
      }

      try {
        // Check if file exists in R2
        const exists = await r2StorageService.fileExists(video.videoPath);

        if (exists) {
          console.log(`   ✅ File exists in R2`);

          // Get metadata
          const metadata = await r2StorageService.getFileMetadata(video.videoPath);
          const sizeInMB = (metadata.ContentLength / 1024 / 1024).toFixed(2);

          console.log(`   📊 File size: ${sizeInMB} MB`);
          console.log(`   📦 Content type: ${metadata.ContentType}`);
          console.log(`   📅 Last modified: ${metadata.LastModified}`);

          // Try to get a small chunk to test streaming
          try {
            const { stream, contentType } = await r2StorageService.getVideoStream(
              video.videoPath,
              0,
              1024 // Just get first 1KB
            );
            console.log(`   ✅ Streaming test successful`);

            // Consume the stream to prevent memory leak
            if (stream && typeof stream.on === 'function') {
              stream.on('data', () => {});
              stream.on('end', () => {});
            }
          } catch (streamError: any) {
            console.log(`   ❌ Streaming test failed: ${streamError.message}`);
          }
        } else {
          console.log(`   ❌ File DOES NOT exist in R2`);
          console.log(`   💡 This video needs to be re-uploaded`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error checking file: ${error.message}`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log('✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkR2Videos();
