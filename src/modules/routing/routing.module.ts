import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoutingController } from './presentation/controllers/routing.controller';
import { OrsRoutingProvider } from './services/ors-routing.provider';
import { DijkstraRoutingProvider } from './services/dijkstra-routing.provider';

@Module({
  imports: [ConfigModule],
  controllers: [RoutingController],
  providers: [
    OrsRoutingProvider,
    DijkstraRoutingProvider,
    {
      provide: 'IRoutingProvider',
      useClass: OrsRoutingProvider,
    },
  ],
  exports: [OrsRoutingProvider, DijkstraRoutingProvider, 'IRoutingProvider'],
})
export class RoutingModule {}
