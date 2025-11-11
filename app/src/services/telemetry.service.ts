export async function logDigitalIdEvent(eventType: 'hover' | 'modal_open') {
  try {
    await fetch('/api/telemetry/digital-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventType }),
    });
  } catch (error) {
    // Non-blocking
    console.warn('Digital ID telemetry failed', error);
  }
}
