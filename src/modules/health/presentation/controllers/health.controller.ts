import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@modules/auth/infrastructure/auth/decorators/public.decorator';

/**
 * Health Check Controller — Kiểm tra sức khỏe hệ thống.
 *
 * Endpoint này dùng cho:
 * - Load balancer (nginx, AWS ALB) kiểm tra server sống không
 * - Kubernetes liveness/readiness probe
 * - Monitoring dashboard (Grafana, Prometheus)
 * - DevOps debug nhanh
 *
 * === CÁCH HOẠT ĐỘNG ===
 *
 * 1. Gọi từng HealthIndicator (DB, Memory...)
 * 2. Nếu TẤT CẢ indicator OK → 200 + { status: 'ok' }
 * 3. Nếu BẤT KỲ indicator fail → 503 + { status: 'error', detail: ... }
 *
 * === TỪ KHÓA NÂNG CAO ===
 * - Health Check Pattern: chuẩn industry cho microservice
 * - Liveness vs Readiness Probe: K8s dùng 2 loại probe khác nhau
 *   - Liveness: server còn sống không? (restart nếu chết)
 *   - Readiness: server sẵn sàng nhận request chưa? (remove từ LB nếu chưa)
 * - Terminus: tên từ thần La Mã bảo vệ ngưỡng cửa → bảo vệ "gateway" hệ thống
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health Check',
    description:
      'Kiểm tra sức khỏe hệ thống: kết nối DB, memory usage. Trả 200 nếu OK, 503 nếu fail.',
  })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động bình thường' })
  @ApiResponse({
    status: 503,
    description: 'Một hoặc nhiều service không khả dụng',
  })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }
}
