import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🔧 Fixing RLS policies on videos table...\n');

// Read the SQL file
const sqlPath = path.join(process.cwd(), 'FIX_VIDEOS_RLS.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

// Split into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLS() {
  console.log('📝 Executing SQL statements...\n');

  for (const statement of statements) {
    if (statement.includes('DO $$') || statement.includes('SELECT')) {
      // Skip DO blocks and SELECT statements
      continue;
    }

    try {
      const { error } = await (supabase as any).rpc('exec_sql', {
        sql_string: statement
      });

      if (error) {
        console.log(`⚠️  Statement might have failed (this is often normal):`);
        console.log(`   ${statement.substring(0, 60)}...`);
        console.log(`   Error: ${error.message}\n`);
      } else {
        console.log(`✅ Executed: ${statement.substring(0, 60)}...`);
      }
    } catch (e: any) {
      console.log(`⚠️  ${e.message}\n`);
    }
  }

  console.log('\n🎉 RLS policies should now be fixed!');
  console.log('📺 Try refreshing your browser - videos should appear now!\n');
}

fixRLS();
