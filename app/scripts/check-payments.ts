/**
 * Check payment records
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

async function checkPayments() {
  console.log('🔍 Checking payment records...\n');

  // Get all payments with user and video details
  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id,
      user_id,
      video_id,
      amount,
      status,
      transaction_signature,
      created_at,
      users:user_id (
        wallet_address,
        username
      ),
      videos:video_id (
        title,
        price
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error fetching payments:', error);
    return;
  }

  console.log(`Found ${payments?.length || 0} payment records:\n`);

  payments?.forEach((payment: any, index: number) => {
    console.log(`${index + 1}. User: ${payment.users?.username || 'Unknown'} (${payment.users?.wallet_address?.slice(0, 8)}...)`);
    console.log(`   Video: ${payment.videos?.title || 'Unknown'}`);
    console.log(`   Amount: $${payment.amount}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Transaction: ${payment.transaction_signature?.slice(0, 20)}...`);
    console.log(`   Date: ${new Date(payment.created_at).toLocaleString()}`);
    console.log('');
  });

  if (payments?.length === 0) {
    console.log('⚠️  No payment records found.');
  }

  // Check for verified payments without video access
  const verifiedPayments = payments?.filter((p: any) => p.status === 'verified' || p.status === 'completed');
  if (verifiedPayments && verifiedPayments.length > 0) {
    console.log(`\n✅ Found ${verifiedPayments.length} verified/completed payments that should have video access.`);
  }
}

checkPayments().then(() => process.exit(0));
