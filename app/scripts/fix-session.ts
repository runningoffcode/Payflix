/**
 * Session Repair Script
 * Fixes session data inconsistencies by recalculating remaining_amount
 * Usage: npx ts-node scripts/fix-session.ts <wallet-address>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSession(walletAddress: string) {
  console.log('🔧 SESSION REPAIR TOOL\n');
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

    console.log('📊 CURRENT SESSION DATA:\n');
    console.log(`Session ID: ${session.id}`);
    console.log(`approved_amount:   ${session.approved_amount}`);
    console.log(`spent_amount:      ${session.spent_amount}`);
    console.log(`remaining_amount:  ${session.remaining_amount}`);

    // Parse and calculate
    const approved = parseFloat(session.approved_amount);
    const spent = parseFloat(session.spent_amount);
    const storedRemaining = parseFloat(session.remaining_amount);
    const correctRemaining = Math.round((approved - spent) * 100) / 100;

    console.log(`\n🔢 CALCULATIONS:\n`);
    console.log(`Stored remaining:    ${storedRemaining.toFixed(2)}`);
    console.log(`Correct remaining:   ${correctRemaining.toFixed(2)}`);
    console.log(`Difference:          ${Math.abs(storedRemaining - correctRemaining).toFixed(6)}`);

    // Check if fix is needed
    const difference = Math.abs(storedRemaining - correctRemaining);
    if (difference < 0.01) {
      console.log(`\n✅ No fix needed - session data is consistent!\n`);
      process.exit(0);
    }

    console.log(`\n⚠️  INCONSISTENCY DETECTED - FIX REQUIRED\n`);
    console.log(`Updating remaining_amount: ${storedRemaining} -> ${correctRemaining}`);

    // Update the session
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        approved_amount: approved,
        remaining_amount: correctRemaining,
      })
      .eq('id', session.id);

    if (updateError) {
      console.error(`❌ Failed to update session:`, updateError);
      process.exit(1);
    }

    console.log(`\n✅ SESSION FIXED!\n`);
    console.log(`New balance: ${correctRemaining.toFixed(2)} USDC`);
    console.log(`\n=====================================\n`);

    // Verify the fix
    const { data: updatedSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_wallet', walletAddress)
      .eq('status', 'active')
      .single();

    if (updatedSession) {
      const newRemaining = parseFloat(updatedSession.remaining_amount);
      console.log(`\n✅ VERIFICATION:`);
      console.log(`Updated remaining_amount: ${newRemaining.toFixed(2)}`);
      console.log(`Expected: ${correctRemaining.toFixed(2)}`);
      if (Math.abs(newRemaining - correctRemaining) < 0.01) {
        console.log(`✅ Fix verified successfully!\n`);
      } else {
        console.log(`⚠️  Warning: Values don't match after update\n`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get wallet address from command line
const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('Usage: npx ts-node scripts/fix-session.ts <wallet-address>');
  process.exit(1);
}

fixSession(walletAddress).then(() => {
  process.exit(0);
});
