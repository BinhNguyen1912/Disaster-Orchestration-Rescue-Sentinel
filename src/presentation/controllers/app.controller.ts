import { Controller, Get } from '@nestjs/common';
import { AppService } from '../../application/services/app.service';
import { Public } from '../../infrastructure/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
