import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { LocationService } from '../../application/services/location.service';
import { Public } from '@shared/common/decorators/public.decorator';

@Public()
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('provinces')
  async getAllProvinces() {
    const provinces = await this.locationService.getAllProvinces();
    return {
      success: true,
      data: provinces,
    };
  }

  @Get('geocode')
  async geocode(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('viewbox') viewbox?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 6;
    const results = await this.locationService.queryGeocoding(
      q,
      limitNum,
      viewbox,
    );
    return {
      success: true,
      data: results,
    };
  }

  @Get('resolve')
  async resolveLocation(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      return {
        success: true,
        data: null,
      };
    }
    const unit = await this.locationService.findUnitByCoordinates(
      latitude,
      longitude,
    );
    return {
      success: true,
      data: unit
        ? {
            provinceId: unit.provinceId,
            adminUnitId: unit.id,
          }
        : null,
    };
  }

  @Get('provinces/:id')
  async getProvinceById(@Param('id', ParseIntPipe) id: number) {
    const province = await this.locationService.getProvinceById(id);
    return {
      success: true,
      data: province,
    };
  }

  @Get('wards')
  async getWardsByProvinceId(
    @Query('provinceId', ParseIntPipe) provinceId: number,
  ) {
    const wards = await this.locationService.getWardsByProvinceId(provinceId);
    return {
      success: true,
      data: wards,
    };
  }

  @Get('provinces/:id/center')
  async getProvinceCenter(@Param('id', ParseIntPipe) id: number) {
    const province = await this.locationService.getProvinceById(id);
    if (!province) {
      return {
        success: true,
        data: null,
      };
    }

    if (province.centerPoint?.coordinates) {
      return {
        success: true,
        data: {
          provinceCode: province.code,
          lng: province.centerPoint.coordinates[0],
          lat: province.centerPoint.coordinates[1],
        },
      };
    }

    const centers = this.locationService.getProvinceCenters();
    const center = centers.find((c) => c.provinceCode === province.code);

    return {
      success: true,
      data: center || null,
    };
  }
}
