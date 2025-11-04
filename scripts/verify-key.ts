const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlcm5kZndlcnNndHhhb3dxYmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUyOTc1MywiZXhwIjoyMDc3MTA1NzUzfQ.Oto840a3rZk1hvGUFrUm-tHTMgD-SAYByCTYcGta5ZY";

const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
console.log('Key payload:', JSON.stringify(payload, null, 2));
console.log('\nRole:', payload.role);
console.log('Is service_role?', payload.role === 'service_role' ? '✅ YES' : '❌ NO');
