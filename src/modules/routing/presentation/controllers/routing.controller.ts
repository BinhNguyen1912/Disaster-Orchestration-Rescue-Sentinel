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
    // Comment out Dijkstra provider dependency
    // private readonly dijkstraRoutingProvider: DijkstraRoutingProvider,
  ) { }

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
    let isIsolated = false;

    try {
      result = await this.routingProvider.calculateRoute(
        startCoords,
        endCoords,
        dto.avoidPolygons || [],
        dto.profile || 'car',
      );
    } catch (err) {
      // Nếu không tìm được đường tránh ngập, thử tìm đường đi không tránh ngập (cô lập)
      try {
        result = await this.routingProvider.calculateRoute(
          startCoords,
          endCoords,
          [],
          dto.profile || 'car',
        );
        isIsolated = true;
      } catch (orsErr) {
        throw new BadRequestException(
          `Không thể tính toán tuyến đường: ${orsErr?.message || 'Lỗi kết nối bản đồ'}`,
        );
      }
    }

    return {
      success: true,
      data: {
        primary: result,
        dijkstra: null,
        isIsolated,
      },
    };
  }
}
