/**
 * Session Diagnostic Script
 * Checks for and reports session data inconsistencies
 * Usage: npx ts-node scripts/diagnose-session.ts <wallet-address>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseSession(walletAddress: string) {
  console.log('🔍 SESSION DIAGNOSTIC TOOL\n');
  console.log(`Wallet: ${walletAddress}\n`);
  console.log('=====================================\n');

  try {
    // Get active session
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_wallet', walletAddress)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .gt('remaining_amount', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) {
      console.log('❌ No active session found for this wallet\n');
      process.exit(0);
    }

    console.log('📊 SESSION DATA:\n');
    console.log(`Session ID: ${session.id}`);
    console.log(`Status: ${session.status}`);
    console.log(`Created: ${session.created_at}`);
    console.log(`Expires: ${session.expires_at}`);
    console.log(`\n💰 BALANCE DATA (from database):\n`);
    console.log(`approved_amount:   ${session.approved_amount}`);
    console.log(`spent_amount:      ${session.spent_amount}`);
    console.log(`remaining_amount:  ${session.remaining_amount}`);

    // Parse values
    const approved = parseFloat(session.approved_amount);
    const spent = parseFloat(session.spent_amount);
    const storedRemaining = parseFloat(session.remaining_amount);
    const calculatedRemaining = approved - spent;

    console.log(`\n🔢 CALCULATIONS:\n`);
    console.log(`Stored remaining:      ${storedRemaining.toFixed(6)}`);
    console.log(`Calculated remaining:  ${calculatedRemaining.toFixed(6)}`);
    console.log(`(approved - spent):    (${approved} - ${spent}) = ${calculatedRemaining.toFixed(6)}`);

    // Check consistency
    const difference = Math.abs(storedRemaining - calculatedRemaining);
    console.log(`\n✅ CONSISTENCY CHECK:\n`);
    console.log(`Difference: ${difference.toFixed(6)}`);

    if (difference > 0.01) {
      console.log(`\n⚠️  INCONSISTENCY DETECTED!`);
      console.log(`\nThe stored remaining_amount (${storedRemaining}) does not match`);
      console.log(`the calculated value (approved - spent = ${calculatedRemaining})`);
      console.log(`\nThis could be due to a previous bug in the withdrawal logic.`);
      console.log(`\n🔧 RECOMMENDED FIX:`);
      console.log(`The remaining_amount should be updated to: ${calculatedRemaining.toFixed(2)}`);
    } else {
      console.log(`✅ Session data is consistent!`);
    }

    // Check for invalid states
    console.log(`\n🛡️  VALIDATION CHECKS:\n`);

    if (approved < 0) {
      console.log(`❌ INVALID: approved_amount is negative (${approved})`);
    } else {
      console.log(`✅ approved_amount is valid (${approved})`);
    }

    if (spent < 0) {
      console.log(`❌ INVALID: spent_amount is negative (${spent})`);
    } else {
      console.log(`✅ spent_amount is valid (${spent})`);
    }

    if (calculatedRemaining < 0) {
      console.log(`❌ INVALID: calculated remaining is negative (${calculatedRemaining})`);
      console.log(`   This means spent (${spent}) > approved (${approved})`);
    } else {
      console.log(`✅ calculated remaining is valid (${calculatedRemaining})`);
    }

    if (spent > approved) {
      console.log(`❌ INVALID: spent_amount (${spent}) > approved_amount (${approved})`);
    } else {
      console.log(`✅ spent <= approved relationship is valid`);
    }

    console.log(`\n=====================================\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get wallet address from command line
const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('Usage: npx ts-node scripts/diagnose-session.ts <wallet-address>');
  process.exit(1);
}

diagnoseSession(walletAddress).then(() => {
  process.exit(0);
});
