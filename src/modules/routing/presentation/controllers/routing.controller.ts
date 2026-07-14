import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
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
  private readonly logger = new Logger(RoutingController.name);

  constructor(
    @Inject('IRoutingProvider')
    private readonly routingProvider: IRoutingProvider,
    private readonly dijkstraRoutingProvider: DijkstraRoutingProvider,
    private readonly configService: ConfigService,
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
    let dijkstraResult: RouteResult | null = null;
    let isIsolated = false;

    // Xác định provider đang dùng
    const service = (this.configService.get<string>('ROUTING_SERVICE') || 'DIJKSTRA').toUpperCase();
    const isDijkstraPrimary = service === 'DIJKSTRA';
    // 1. Nếu primary không phải Dijkstra: tính Dijkstra trước làm đường phụ đối chứng + safety-net
    if (!isDijkstraPrimary) {
      try {
        dijkstraResult = await this.dijkstraRoutingProvider.calculateRoute(
          startCoords,
          endCoords,
          dto.avoidPolygons || [],
          dto.profile || 'car',
        );
      } catch (dijkstraErr) {
        this.logger.warn(`Failed to calculate auxiliary Dijkstra route: ${dijkstraErr.message}`);
      }
    }

    // 2. Tính toán đường đi chính thức
    try {
      result = await this.routingProvider.calculateRoute(
        startCoords,
        endCoords,
        dto.avoidPolygons || [],
        dto.profile || 'car',
      );
    } catch (err) {
      this.logger.warn(
        `[Routing] Primary provider (${service}) failed: ${err.message}. Falling back to Dijkstra...`,
      );
      // Nếu ORS lỗi, sử dụng Dijkstra làm đường đi chính
      if (dijkstraResult) {
        result = dijkstraResult;
        dijkstraResult = null; // Đặt null để không vẽ trùng lặp đường phụ lên FE
      } else {
        // Thử tính toán lại Dijkstra nếu bước 1 chưa chạy hoặc bị lỗi
        try {
          result = await this.dijkstraRoutingProvider.calculateRoute(
            startCoords,
            endCoords,
            dto.avoidPolygons || [],
            dto.profile || 'car',
          );
        } catch (dijkstraErr) {
          throw new BadRequestException(
            `Không thể tính toán tuyến đường: ${dijkstraErr?.message || 'Lỗi mạng chốt giao thông'}`,
          );
        }
      }
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
