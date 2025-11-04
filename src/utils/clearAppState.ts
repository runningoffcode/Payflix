/**
 * Clear all app state when wallet changes
 * This ensures a completely fresh start for the new wallet
 */
export function clearAllAppState() {
  console.log('🧹 Clearing all app state...');

  // Clear ALL localStorage items related to the app
  const keysToRemove = [
    'flix_auth_token',
    'flix_user',
    'flix_session_balance',
    'flix_last_deposit_check',
    'flix_session_id',
    'flix_active_session',
    // Add any other app-specific keys here
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`   ✓ Removed ${key}`);
  });

  // Optional: Clear all localStorage items that start with 'flix_'
  // This is more aggressive but ensures nothing is left behind
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('flix_')) {
      localStorage.removeItem(key);
    }
  });

  // Clear sessionStorage as well
  sessionStorage.clear();

  console.log('   ✅ All app state cleared');
}
