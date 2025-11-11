require('dotenv').config();

const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseUrl = process.env.SUPABASE_URL || '';

console.log('\n🔍 Environment Variable Check:');
console.log('================================');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Not set');
console.log('SUPABASE_SERVICE_KEY:', supabaseKey ? '✅ Set' : '❌ Not set');
console.log('Key length:', supabaseKey.length);
console.log('First 30 chars:', supabaseKey.substring(0, 30));

if (supabaseKey) {
  try {
    // Decode JWT payload to check role
    const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
    console.log('\n📋 JWT Payload:');
    console.log('Role:', payload.role);
    console.log('Issuer:', payload.iss);

    if (payload.role === 'service_role') {
      console.log('\n✅ Correct! This is a service_role key');
    } else {
      console.log('\n⚠️  WARNING: This is a', payload.role, 'key, not service_role!');
    }
  } catch (e) {
    console.error('\n❌ Could not decode JWT:', e.message);
  }
}
