const fs = require('fs');
const path = require('path');

// Read .env file directly
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Parse SUPABASE_SERVICE_KEY
const match = envContent.match(/SUPABASE_SERVICE_KEY=(.+)/);
if (match) {
  const key = match[1].trim();
  console.log('\n📄 Direct .env file read:');
  console.log('Key length:', key.length);
  console.log('First 50 chars:', key.substring(0, 50));

  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
    console.log('\n📋 JWT Payload from .env file:');
    console.log('Role:', payload.role);
    console.log('Issuer:', payload.iss);

    if (payload.role === 'service_role') {
      console.log('\n✅ .env file contains service_role key!');
    } else {
      console.log('\n❌ .env file contains', payload.role, 'key!');
    }
  } catch (e) {
    console.error('\n❌ Could not decode JWT:', e.message);
  }
} else {
  console.log('\n❌ SUPABASE_SERVICE_KEY not found in .env file');
}

// Now check what dotenv loads
console.log('\n\n🔍 Checking dotenv.config():');
require('dotenv').config();
const loadedKey = process.env.SUPABASE_SERVICE_KEY;
console.log('Key loaded by dotenv:', loadedKey ? loadedKey.substring(0, 50) : 'NOT SET');

if (loadedKey) {
  try {
    const payload = JSON.parse(Buffer.from(loadedKey.split('.')[1], 'base64').toString());
    console.log('Role loaded by dotenv:', payload.role);
  } catch (e) {
    console.error('Could not decode:', e.message);
  }
}
