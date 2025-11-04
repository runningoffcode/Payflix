/**
 * Check if a specific video file exists in R2 storage
 * Usage: npx ts-node scripts/check-video-file.ts <video-id>
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize R2 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const bucketName = process.env.R2_BUCKET_NAME!;

async function checkVideoFile(videoId: string) {
  console.log('🔍 VIDEO FILE DIAGNOSTIC TOOL\n');
  console.log(`Video ID: ${videoId}\n`);
  console.log('=====================================\n');

  try {
    // Get video from database
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !video) {
      console.error('❌ Video not found in database:', error?.message || 'No data returned');
      process.exit(1);
    }

    console.log('✅ Video found in database:\n');
    console.log(`   Title: ${video.title}`);
    console.log(`   Creator: ${video.creator_wallet}`);
    console.log(`   Price: ${video.price_usdc} USDC`);
    console.log(`   Video Path: ${video.video_path || 'NOT SET'}`);
    console.log(`   Video URL: ${video.video_url || 'NOT SET'}`);
    console.log(`   Created: ${video.created_at}`);
    console.log('');

    // Check if video_path is set
    if (!video.video_path) {
      console.log('⚠️  WARNING: video_path is not set in database!');
      console.log('   This means the video file was never uploaded to R2.');
      console.log('   The video metadata exists but the actual video file is missing.\n');
      console.log('🔧 SOLUTION:');
      console.log('   1. Upload the video file to R2 storage');
      console.log('   2. Update the video_path in the database\n');
      process.exit(0);
    }

    // Check if file exists in R2
    console.log('🔍 Checking if file exists in R2 storage...\n');

    let fileExists = false;
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: video.video_path,
        })
      );
      fileExists = true;
    } catch (error: any) {
      fileExists = false;
    }

    if (fileExists) {
      console.log('✅ Video file EXISTS in R2 storage!\n');

      // Get file metadata
      try {
        const metadata = await s3Client.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: video.video_path,
          })
        );
        console.log('📊 File Metadata:');
        console.log(`   Size: ${formatBytes(metadata.ContentLength || 0)}`);
        console.log(`   Type: ${metadata.ContentType || 'unknown'}`);
        console.log(`   Last Modified: ${metadata.LastModified || 'unknown'}`);
        console.log('');

        // Try to generate signed URL
        console.log('🔗 Generating test signed URL...');
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: video.video_path,
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        console.log('✅ Signed URL generated successfully!');
        console.log(`   URL: ${signedUrl.substring(0, 100)}...`);
        console.log('');
        console.log('✅ DIAGNOSIS: Video file is accessible and should work!');
        console.log('   If playback still fails, check:');
        console.log('   - Browser console for CORS errors');
        console.log('   - Network tab for the actual R2 request status');
        console.log('   - Video format compatibility (should be MP4)');
      } catch (metadataError) {
        console.error('⚠️  Could not get file metadata:', metadataError);
      }

    } else {
      console.log('❌ Video file DOES NOT EXIST in R2 storage!\n');
      console.log('📂 Expected path:', video.video_path);
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('   The database has a reference to the video file, but the file');
      console.log('   is missing from R2 storage. You need to:');
      console.log('   1. Upload the video file to R2 at the correct path');
      console.log('   2. OR update the video_path in the database to the correct location');
      console.log('   3. OR re-upload the video through the platform\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Get video ID from command line
const videoId = process.argv[2];

if (!videoId) {
  console.error('Usage: npx ts-node scripts/check-video-file.ts <video-id>');
  console.error('Example: npx ts-node scripts/check-video-file.ts video_1762030786954_f8f5r');
  process.exit(1);
}

checkVideoFile(videoId).then(() => {
  process.exit(0);
});
