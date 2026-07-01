import { DijkstraRoutingProvider } from '../src/modules/routing/services/dijkstra-routing.provider';

async function main() {
  const provider = new DijkstraRoutingProvider();
  try {
    const result = await provider.calculateRoute(
      { latitude: 10.7725, longitude: 106.6980 },
      { latitude: 10.7758, longitude: 106.7022 },
      [],
      'car'
    );
    console.log('RESULT:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('ERROR STACK:', err.stack);
    console.error('ERROR MESSAGE:', err.message);
  }
}

main().catch(console.error);
