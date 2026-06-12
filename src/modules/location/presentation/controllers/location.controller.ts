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
    const centers = this.locationService.getProvinceCenters();
    const center = centers.find((c) => c.provinceCode === province?.code);

    return {
      success: true,
      data: center || null,
    };
  }
}
