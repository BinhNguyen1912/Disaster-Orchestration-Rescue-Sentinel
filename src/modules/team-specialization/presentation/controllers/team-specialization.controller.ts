import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TeamSpecializationService } from '../../application/services/team-specialization.service';
import { QueryTeamSpecializationDto } from '../dtos/team-specialization/query-team-specialization.dto';
import {
  CreateTeamSpecializationValidationDto,
  UpdateTeamSpecializationValidationDto,
} from '../dtos/team-specialization/team-specialization.dto';
import { TeamSpecializationResponseDto } from '../dtos/team-specialization/team-specialization-response.dto';
import { Public } from '@modules/auth/infrastructure/auth/decorators/public.decorator';

@ApiTags('Team Specializations')
@Controller('team-specializations')
export class TeamSpecializationController {
  constructor(private readonly service: TeamSpecializationService) {}

  @ApiOperation({ summary: 'Lấy danh sách chuyên môn' })
  @ApiResponse({ status: 200, description: 'Danh sách chuyên môn' })
  @Public()
  @Get()
  async findAll(@Query() query: QueryTeamSpecializationDto) {
    const specs = await this.service.findAll({
      teamType: query.teamType,
      isActive: query.isActive,
    });
    return specs.map((s) => TeamSpecializationResponseDto.fromEntity(s));
  }

  @ApiOperation({ summary: 'Lấy chuyên môn theo id' })
  @ApiResponse({ status: 200, description: 'Chi tiết chuyên môn' })
  @Public()
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const spec = await this.service.findById(id);
    return TeamSpecializationResponseDto.fromEntity(spec);
  }

  @ApiOperation({ summary: 'Tạo chuyên môn mới' })
  @ApiResponse({ status: 201, description: 'Chuyên môn đã được tạo' })
  @Post()
  async create(@Body() dto: CreateTeamSpecializationValidationDto) {
    const spec = await this.service.create(dto);
    return TeamSpecializationResponseDto.fromEntity(spec);
  }

  @ApiOperation({ summary: 'Cập nhật chuyên môn' })
  @ApiResponse({ status: 200, description: 'Chuyên môn đã được cập nhật' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamSpecializationValidationDto,
  ) {
    const spec = await this.service.update(id, dto);
    return TeamSpecializationResponseDto.fromEntity(spec);
  }

  @ApiOperation({ summary: 'Xóa chuyên môn (soft delete)' })
  @ApiResponse({ status: 204, description: 'Đã xóa chuyên môn' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete(id);
  }
}
