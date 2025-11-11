import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AnalyticsDelta {
  views?: number;
  revenue?: number;
  comments?: number;
  subscribers?: number;
}

let supabaseClient: SupabaseClient | null = null;
let clientWarningLogged = false;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (!clientWarningLogged) {
      console.warn('⚠️  Supabase credentials missing. Analytics upserts are disabled.');
      clientWarningLogged = true;
    }
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

function dateKey(date?: Date) {
  return (date ?? new Date()).toISOString().split('T')[0];
}

async function upsertAnalyticsRow(
  table: 'video_analytics' | 'creator_analytics',
  keys: Record<string, string>,
  delta: AnalyticsDelta
) {
  const client = getSupabaseClient();
  if (!client) return;

  const { data } = await client
    .from(table)
    .select('views,revenue,comments,subscribers')
    .match(keys)
    .maybeSingle();

  const payload = {
    ...keys,
    views: Number((data?.views ?? 0) + (delta.views ?? 0)),
    revenue: Number((data?.revenue ?? 0) + (delta.revenue ?? 0)),
    comments: Number((data?.comments ?? 0) + (delta.comments ?? 0)),
    subscribers: Number((data?.subscribers ?? 0) + (delta.subscribers ?? 0)),
  };

  const { error } = await client.from(table).upsert(payload);
  if (error) {
    console.warn(`⚠️  Failed to upsert ${table}:`, error.message);
  }
}

export async function recordVideoAnalyticsDelta(
  videoId: string,
  delta: AnalyticsDelta,
  date?: Date
) {
  if (!videoId) return;
  await upsertAnalyticsRow(
    'video_analytics',
    { video_id: videoId, date: dateKey(date) },
    delta
  );
}

export async function recordCreatorAnalyticsDelta(
  creatorWallet: string | null | undefined,
  delta: AnalyticsDelta,
  date?: Date
) {
  if (!creatorWallet) return;
  await upsertAnalyticsRow(
    'creator_analytics',
    { creator_wallet: creatorWallet, date: dateKey(date) },
    delta
  );
}
