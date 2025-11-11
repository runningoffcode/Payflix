import dotenv from 'dotenv';
dotenv.config();

const key = process.env.SUPABASE_SERVICE_KEY || '';
console.log('Key from env:', key.substring(0, 50) + '...');
console.log('');

const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
console.log('Decoded payload:', JSON.stringify(payload, null, 2));
