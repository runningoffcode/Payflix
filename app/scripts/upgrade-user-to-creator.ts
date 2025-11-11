import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://lerndfwersgtxaowqbga.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlcm5kZndlcnNndHhhb3dxYmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Mjk3NTMsImV4cCI6MjA3NzEwNTc1M30.FYpzUEKiPH7JfLHHIA1QGwc-JhoKjXxFkzsRI9L4tg8'
);

async function upgradeUser() {
  const walletAddress = 'J3WmMHUixgfcUtL5ov4Cn6LE65cDybgAg7mc1PWGyVY';

  console.log('Upgrading user to creator status...');

  const { data, error } = await supabase
    .from('users')
    .update({ is_creator: true })
    .eq('wallet_address', walletAddress)
    .select();

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } else {
    console.log('✅ User upgraded to creator successfully!');
    console.log('   User:', data);
  }
}

upgradeUser().then(() => process.exit(0)).catch((e) => {
  console.error('❌ Script error:', e);
  process.exit(1);
});
