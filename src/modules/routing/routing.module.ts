import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoutingController } from './presentation/controllers/routing.controller';
import { OrsRoutingProvider } from './services/ors-routing.provider';
import { DijkstraRoutingProvider } from './services/dijkstra-routing.provider';
import { TomTomTrafficService } from './services/tomtom-traffic.service';
import { TomTomRoutingProvider } from './services/tomtom-routing.provider';

@Module({
  imports: [ConfigModule],
  controllers: [RoutingController],
  providers: [
    OrsRoutingProvider,
    DijkstraRoutingProvider,
    TomTomTrafficService,
    TomTomRoutingProvider,
    {
      provide: 'IRoutingProvider',
      useFactory: (
        config: ConfigService,
        ors: OrsRoutingProvider,
        dijkstra: DijkstraRoutingProvider,
        tomtom: TomTomRoutingProvider,
      ) => {
        const service = (config.get<string>('ROUTING_SERVICE') || 'TOMTOM').toUpperCase();
        if (service === 'DIJKSTRA') return dijkstra;
        if (service === 'TOMTOM') return tomtom;
        return ors; // Fallback ORS
      },
      inject: [ConfigService, OrsRoutingProvider, DijkstraRoutingProvider, TomTomRoutingProvider],
    },
  ],
  exports: [
    OrsRoutingProvider,
    DijkstraRoutingProvider,
    TomTomTrafficService,
    TomTomRoutingProvider,
    'IRoutingProvider',
  ],
})
export class RoutingModule {}
