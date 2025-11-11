import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

async function listAllVideos() {
  console.log('\n🎬 Fetching ALL videos from database...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log(`📊 Total videos in database: ${videos?.length || 0}\n`);

    if (!videos || videos.length === 0) {
      console.log('✅ Database is empty - no videos found\n');
      return;
    }

    console.log('Videos:\n');
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   Creator Wallet: ${video.creator_wallet}`);
      console.log(`   Price: $${video.price_usdc} USDC`);
      console.log(`   Created: ${video.created_at}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error fetching videos:', error);
  }

  process.exit(0);
}

listAllVideos();
