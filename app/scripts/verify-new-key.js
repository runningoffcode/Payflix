const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlcm5kZndlcnNndHhhb3dxYmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUyOTc1MywiZXhwIjoyMDc3MTA1NzUzfQ.Oto840a3rZk1hvGUFrUm-tHTMgD-SAYByCTYcGta5ZY';

try {
  const payload = JSON.parse(Buffer.from(newKey.split('.')[1], 'base64').toString());
  console.log('\n📋 JWT Payload:');
  console.log('Role:', payload.role);
  console.log('Issuer:', payload.iss);

  if (payload.role === 'service_role') {
    console.log('\n✅ VERIFIED! This is the correct service_role key!');
  } else {
    console.log('\n❌ ERROR: This is a', payload.role, 'key, not service_role!');
  }
} catch (e) {
  console.error('\n❌ Could not decode JWT:', e.message);
}
