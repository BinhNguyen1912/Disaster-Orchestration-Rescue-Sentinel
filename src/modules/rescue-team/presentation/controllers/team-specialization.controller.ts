import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TeamSpecializationService } from '../../application/services/team-specialization.service';
import { QueryTeamSpecializationDto } from '../dtos/team-specialization/query-team-specialization.dto';
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
    return this.service.findAll(query.teamType);
  }
}
