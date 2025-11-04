import dotenv from 'dotenv';
dotenv.config();

const key = process.env.SUPABASE_SERVICE_KEY || '';
const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
console.log('\n🔑 Server is using key with role:', payload.role);
console.log(payload.role === 'service_role' ? '✅ CORRECT - Using service_role key!' : '❌ WRONG - Still using anon key!');
console.log('');
