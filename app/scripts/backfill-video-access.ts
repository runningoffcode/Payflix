/**
 * Backfill video access for verified payments
 * This grants access to videos for payments that were verified but didn't create access records
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

async function backfillVideoAccess() {
  console.log('🔄 Backfilling video access for verified payments...\n');

  // Get all verified payments
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'verified')
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('❌ Error fetching payments:', paymentsError);
    return;
  }

  console.log(`Found ${payments?.length || 0} verified payments\n`);

  let created = 0;
  let skipped = 0;

  for (const payment of payments || []) {
    // Check if video access already exists
    const { data: existingAccess } = await supabase
      .from('video_access')
      .select('*')
      .eq('user_id', payment.user_id)
      .eq('video_id', payment.video_id)
      .single();

    if (existingAccess) {
      console.log(`⏩ Skipping payment ${payment.id} - access already exists`);
      skipped++;
      continue;
    }

    // Create video access
    const { error: insertError } = await supabase
      .from('video_access')
      .insert([
        {
          user_id: payment.user_id,
          video_id: payment.video_id,
          payment_id: payment.id,
          expires_at: new Date('2099-12-31').toISOString(), // Lifetime access
        },
      ]);

    if (insertError) {
      console.error(`❌ Error creating access for payment ${payment.id}:`, insertError);
      continue;
    }

    console.log(`✅ Created video access for payment ${payment.id}`);
    console.log(`   User: ${payment.user_id}`);
    console.log(`   Video: ${payment.video_id}`);
    console.log(`   Amount: $${payment.amount}`);
    console.log('');
    created++;
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${created} video access records`);
  console.log(`   ⏩ Skipped: ${skipped} (already had access)`);
  console.log(`   📝 Total payments: ${payments?.length || 0}`);
}

backfillVideoAccess().then(() => process.exit(0));
