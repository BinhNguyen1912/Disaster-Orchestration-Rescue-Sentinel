import { Controller, Get, Scope } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@shared/common/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface CpuUsage {
  idle: number;
  total: number;
}

@ApiTags('Health')
@Controller({ path: 'health', scope: Scope.REQUEST })
export class HealthController {
  private readonly startTime = Date.now();
  private readonly appVersion: string;
  private readonly nodeVersion = process.version;
  private previousCpuUsage: CpuUsage | null = null;

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {
    this.appVersion = this.readAppVersion();
  }

  private readAppVersion(): string {
    try {
      const packagePath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      totalTick +=
        cpu.times.idle +
        cpu.times.user +
        cpu.times.sys +
        cpu.times.irq +
        cpu.times.nice;
      totalIdle += cpu.times.idle;
    }

    const currentUsage: CpuUsage = {
      idle: totalIdle,
      total: totalTick,
    };

    if (!this.previousCpuUsage) {
      this.previousCpuUsage = currentUsage;
      return 0;
    }

    const idleDiff = currentUsage.idle - this.previousCpuUsage.idle;
    const totalDiff = currentUsage.total - this.previousCpuUsage.total;
    const usage =
      totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;

    this.previousCpuUsage = currentUsage;
    return usage;
  }

  private getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    rssUsed: number;
    rssTotal: number;
  } {
    const heapUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const heapTotal = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
    const rssUsed = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const rssTotal = Math.round(os.totalmem() / 1024 / 1024);

    return { heapUsed, heapTotal, rssUsed, rssTotal };
  }

  private async getDbResponseTime(): Promise<number> {
    const start = Date.now();
    await this.db.pingCheck('database', { timeout: 3000 });
    return Date.now() - start;
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health Check',
    description:
      'Kiểm tra sức khỏe hệ thống: kết nối DB, memory usage, CPU, uptime. Trả 200 nếu OK, 503 nếu fail.',
  })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động bình thường' })
  @ApiResponse({
    status: 503,
    description: 'Một hoặc nhiều service không khả dụng',
  })
  async check(): Promise<HealthCheckResult & Record<string, unknown>> {
    const dbResponseTime = await this.getDbResponseTime();
    const memory = this.getMemoryUsage();
    const cpuUsage = this.getCpuUsage();

    const result = await this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);

    const response = result as HealthCheckResult & Record<string, unknown>;

    // Thêm metadata vào response gốc của terminus
    response.timestamp = new Date().toISOString();
    response.uptime = this.getUptime();
    response.version = this.appVersion;
    response.nodeVersion = this.nodeVersion;

    // Cập nhật details với thông tin chi tiết hơn
    if (response.details) {
      const details = response.details as Record<
        string,
        { status: string; used?: number; total?: number; responseTime?: number }
      >;

      if (details['database']) {
        details['database'] = {
          status: details['database'].status,
          responseTime: dbResponseTime,
        };
      }

      if (details['memory_heap']) {
        details['memory_heap'] = {
          status: details['memory_heap'].status,
          used: memory.heapUsed,
          total: memory.heapTotal,
        };
      }

      if (details['memory_rss']) {
        details['memory_rss'] = {
          status: details['memory_rss'].status,
          used: memory.rssUsed,
          total: memory.rssTotal,
        };
      }
    }

    // Thêm CPU usage vào info
    if (response.info) {
      const info = response.info as Record<string, { status: string }>;
      info['cpu'] = { status: cpuUsage > 80 ? 'down' : 'up' };
    }

    // Thêm CPU vào details
    if (response.details) {
      const details = response.details as Record<string, unknown>;
      details['cpu'] = {
        status: cpuUsage > 80 ? 'down' : 'up',
        usage: cpuUsage,
      };
    }

    return response;
  }
}
