"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dijkstra_routing_provider_1 = require("../src/modules/routing/services/dijkstra-routing.provider");
async function main() {
    const provider = new dijkstra_routing_provider_1.DijkstraRoutingProvider();
    try {
        const result = await provider.calculateRoute({ latitude: 10.7725, longitude: 106.6980 }, { latitude: 10.7758, longitude: 106.7022 }, [], 'car');
        console.log('RESULT:', JSON.stringify(result, null, 2));
    }
    catch (err) {
        console.error('ERROR STACK:', err.stack);
        console.error('ERROR MESSAGE:', err.message);
    }
}
main().catch(console.error);
//# sourceMappingURL=test-dijkstra-direct.js.map