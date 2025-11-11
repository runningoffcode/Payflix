import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

async function verifyServiceRole() {
  console.log('\n🔍 Verifying Supabase keys...\n');

  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SERVICE_KEY (first 50 chars):', supabaseKey.substring(0, 50) + '...');
  console.log('ANON_KEY (first 50 chars):', anonKey.substring(0, 50) + '...');
  console.log('');

  // Decode JWT to check role
  const servicePayload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
  const anonPayload = JSON.parse(Buffer.from(anonKey.split('.')[1], 'base64').toString());

  console.log('SERVICE_KEY Role:', servicePayload.role);
  console.log('ANON_KEY Role:', anonPayload.role);
  console.log('');

  // Test with service key
  console.log('Testing DELETE with service_role key...');
  const supabaseService = createClient(supabaseUrl, supabaseKey);
  
  const { data: serviceData, error: serviceError } = await supabaseService
    .from('videos')
    .delete()
    .eq('id', 'video_1761985577326_fe4322')
    .select();

  console.log('Service Role Delete Result:');
  console.log('  Data:', serviceData);
  console.log('  Error:', serviceError);
  console.log('  Rows affected:', serviceData?.length || 0);

  process.exit(0);
}

verifyServiceRole();
