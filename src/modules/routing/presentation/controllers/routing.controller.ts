import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Public } from '@shared/common/decorators/public.decorator';
import type {
  IRoutingProvider,
  RouteCoordinates,
  RouteResult,
} from '../../interfaces/routing-provider.interface';
import { DijkstraRoutingProvider } from '../../services/dijkstra-routing.provider';

export class CalculateRouteDto {
  start: RouteCoordinates;
  end: RouteCoordinates;
  avoidPolygons?: any[];
  profile?: 'car' | 'foot' | 'boat';
}

@ApiTags('Routing')
@Controller('routing')
export class RoutingController {
  constructor(
    @Inject('IRoutingProvider')
    private readonly routingProvider: IRoutingProvider,
    private readonly dijkstraRoutingProvider: DijkstraRoutingProvider,
  ) {}

  @Public()
  @Post('calculate')
  @ApiOperation({ summary: 'Tính toán đường đi tránh ngập lụt giữa 2 điểm' })
  @ApiBody({ type: CalculateRouteDto })
  async calculateRoute(@Body() dto: CalculateRouteDto) {
    const startCoords: RouteCoordinates = {
      latitude: Number(dto.start.latitude),
      longitude: Number(dto.start.longitude),
    };

    const endCoords: RouteCoordinates = {
      latitude: Number(dto.end.latitude),
      longitude: Number(dto.end.longitude),
    };

    let result: RouteResult;
    let dijkstraResult: RouteResult | null = null;
    let isIsolated = false;
    let orsFailed = false;

    // Try ORS first, fall back to Dijkstra if ORS fails (e.g., missing API key)
    try {
      result = await this.routingProvider.calculateRoute(
        startCoords,
        endCoords,
        dto.avoidPolygons || [],
        dto.profile || 'car',
      );
    } catch (err) {
      // If ORS failed, try ORS again without avoidPolygons first (to preserve high-res road routes)
      try {
        result = await this.routingProvider.calculateRoute(
          startCoords,
          endCoords,
          [],
          dto.profile || 'car',
        );
        orsFailed = false; // ORS succeeded without avoidPolygons!
        isIsolated = true; // It means avoiding polygons failed, so it's isolated!
      } catch (orsErr) {
        orsFailed = true;
        // Log the ORS error but don't crash - fall back to Dijkstra
        console.warn(
          `ORS routing failed completely, falling back to Dijkstra: ${orsErr?.message || 'Unknown error'}`,
        );
        // Use Dijkstra as primary if ORS fails completely
        try {
          result = await this.dijkstraRoutingProvider.calculateRoute(
            startCoords,
            endCoords,
            dto.avoidPolygons || [],
            dto.profile || 'car',
          );
        } catch (dijkstraErr) {
          if (
            dijkstraErr instanceof BadRequestException &&
            dijkstraErr.message.includes('cô lập')
          ) {
            isIsolated = true;
          }
          // Fall back to Dijkstra without avoidPolygons
          result = await this.dijkstraRoutingProvider.calculateRoute(
            startCoords,
            endCoords,
            [],
            dto.profile || 'car',
          );
        }
      }
    }

    try {
      // Only calculate Dijkstra separately if ORS succeeded, otherwise Dijkstra is already the primary
      if (!orsFailed) {
        dijkstraResult = await this.dijkstraRoutingProvider.calculateRoute(
          startCoords,
          endCoords,
          dto.avoidPolygons || [],
          dto.profile || 'car',
        );
      }
    } catch (err) {
      if (
        err instanceof BadRequestException &&
        err.message.includes('cô lập')
      ) {
        isIsolated = true;
      }
      // dijkstraResult stays null - that's fine
    }

    return {
      success: true,
      data: {
        primary: result,
        dijkstra: dijkstraResult,
        isIsolated,
      },
    };
  }
}
