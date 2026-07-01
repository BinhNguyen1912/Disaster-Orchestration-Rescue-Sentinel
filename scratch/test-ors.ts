async function main() {
  try {
    const response = await fetch('http://localhost:8585/routing/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start: { latitude: 10.7725, longitude: 106.6980 },
        end: { latitude: 10.7758, longitude: 106.7022 },
        avoidPolygons: [],
        profile: 'car'
      })
    });
    console.log('STATUS:', response.status);
    const data = await response.json();
    console.log('RESPONSE:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('ERROR:', err.message);
  }
}

main().catch(console.error);
