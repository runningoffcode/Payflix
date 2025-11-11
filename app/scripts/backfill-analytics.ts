import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  recordCreatorAnalyticsDelta,
  recordVideoAnalyticsDelta,
} from '../server/services/analytics-upsert.service';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  console.log(`🔄 Backfilling analytics since ${sinceIso}`);

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('video_id, creator_wallet, amount, created_at, status')
    .gte('created_at', sinceIso);

  if (paymentsError) {
    console.error('Failed to fetch payments:', paymentsError.message);
    process.exit(1);
  }

  type Bucket = {
    videoId: string;
    creatorWallet: string | null;
    date: string;
    revenue: number;
    views: number;
  };

  const paymentBuckets = new Map<string, Bucket>();

  (payments || []).forEach((payment) => {
    if (!payment.video_id || payment.status !== 'verified') {
      return;
    }
    const date = new Date(payment.created_at).toISOString().split('T')[0];
    const key = `${payment.video_id}_${date}`;
    if (!paymentBuckets.has(key)) {
      paymentBuckets.set(key, {
        videoId: payment.video_id,
        creatorWallet: payment.creator_wallet || null,
        date,
        revenue: 0,
        views: 0,
      });
    }
    const bucket = paymentBuckets.get(key)!;
    bucket.revenue += Number(payment.amount || 0);
    bucket.views += 1;
  });

  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('video_id, created_at, payment_id');

  if (commentsError) {
    console.error('Failed to fetch comments:', commentsError.message);
    process.exit(1);
  }

  const commentBuckets = new Map<string, number>();
  (comments || []).forEach((comment) => {
    const created = new Date(comment.created_at);
    if (created < since) return;
    const date = created.toISOString().split('T')[0];
    const key = `${comment.video_id}_${date}`;
    commentBuckets.set(key, (commentBuckets.get(key) || 0) + 1);
  });

  let processed = 0;

  for (const bucket of paymentBuckets.values()) {
    const dateObj = new Date(bucket.date);
    await recordVideoAnalyticsDelta(
      bucket.videoId,
      { revenue: bucket.revenue, views: bucket.views },
      dateObj
    );
    await recordCreatorAnalyticsDelta(
      bucket.creatorWallet,
      { revenue: bucket.revenue, views: bucket.views },
      dateObj
    );
    processed += 1;
  }

  for (const [key, count] of commentBuckets.entries()) {
    const [videoId, date] = key.split('_');
    const dateObj = new Date(date);
    await recordVideoAnalyticsDelta(videoId, { comments: count }, dateObj);
    const { data } = await supabase
      .from('videos')
      .select('creator_wallet')
      .eq('id', videoId)
      .maybeSingle();
    await recordCreatorAnalyticsDelta(data?.creator_wallet || null, { comments: count }, dateObj);
    processed += 1;
  }

  console.log(`✅ Backfill complete. Processed ${processed} buckets.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
