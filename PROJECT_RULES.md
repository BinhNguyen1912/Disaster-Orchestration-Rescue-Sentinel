# Project Rules

## 1. Module Structure

Mỗi module phải có cấu trúc thống nhất:

```
modules/
  {module-name}/
    domain/
      entities/           # Domain entities (interface/type)
      repositories/       # Repository interfaces (ports)
    application/
      dtos/              # Data Transfer Objects
      interfaces/        # Service interfaces (use cases)
      services/          # Service implementations
    infrastructure/
      persistence/
        repositories/    # Repository implementations
    presentation/
      controllers/       # Controllers
      dtos/              # Validation & Response DTOs
    {module-name}.module.ts
```

## 2. Required Files cho mỗi Module

### Domain Layer
- `domain/entities/*.entity.ts` — Domain entity (interface/type)
- `domain/repositories/*.repository.interface.ts` — Repository interface (port)

### Application Layer
- `application/dtos/*.dto.ts` — DTOs cho create/update
- `application/interfaces/*.interface.ts` — Service interface (bắt buộc)
- `application/services/*.service.ts` — Service implementation

### Infrastructure Layer
- `infrastructure/persistence/repositories/*.repository.ts` — Repository implementation

### Presentation Layer
- `presentation/controllers/*.controller.ts` — REST controller
- `presentation/dtos/*/*.dto.ts` — Validation DTOs
- `presentation/dtos/*/*-response.dto.ts` — Response DTOs

## 3. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Entity Interface | PascalCase | `RescueTeam`, `Role` |
| Repository Interface | `I{Name}Repository` | `IRescueTeamRepository` |
| Service Interface | `I{Name}Service` | `IRoleService` |
| DTO | PascalCase | `CreateRoleDto`, `RoleResponseDto` |
| Validation DTO | `{Name}ValidationDto` | `CreateRoleValidationDto` |
| Controller | PascalCase | `RoleController`, `RescueTeamController` |

## 4. Service Interface Pattern (BẮT BUỘC)

**MỌI service phải có interface**, không được implement trực tiếp:

```typescript
// ✅ ĐÚNG
export interface IRoleService {
  create(dto: CreateRoleDto): Promise<Role>;
  findAll(filters, pagination): Promise<PaginatedResult<Role>>;
  findById(id: number): Promise<Role>;
  update(id: number, dto: UpdateRoleDto): Promise<Role>;
  delete(id: number): Promise<void>;
}

@Injectable()
export class RoleService implements IRoleService {
  // ...
}
```

```typescript
// ❌ SAI - Không có interface
@Injectable()
export class RoleService {
  // ...
}
```

## 5. Repository Pattern

### Interface (Port)
```typescript
export interface IRoleRepository {
  findById(id: number): Promise<Role | null>;
  findAll(filters, pagination): Promise<{ items: Role[]; total: number }>;
  create(data: Partial<Role>): Promise<Role>;
  update(id: number, data: Partial<Role>): Promise<Role | null>;
  delete(id: number): Promise<boolean>;
}
```

### Implementation (Adapter)
```typescript
@Injectable()
export class RoleRepositoryImpl implements IRoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repo: Repository<RoleEntity>,
  ) {}
  // ...
}
```

## 6. Module Registration

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity])],
  controllers: [RoleController],
  providers: [
    RoleService,
    {
      provide: 'IRoleRepository',
      useClass: RoleRepositoryImpl,
    },
  ],
  exports: [RoleService],
})
export class RoleModule {}
```

## 7. Permissions cho Controller

Sử dụng `Permissions` từ `@shared/common/constants/permissions.constant`:

```typescript
@RequirePermissions(Permissions.USER_MANAGE)
async create(@Body() dto: CreateRoleValidationDto) {
  // ...
}
```

## 8. Response DTO Pattern

```typescript
export class RoleResponseDto {
  id: number;
  name: string;
  // ... fields

  static fromEntity(entity: RoleEntity): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    // ... map fields
    return dto;
  }
}
```

## 9. Error Messages

Dùng `APP_MESSAGES` từ `@shared/index` để định nghĩa messages:

```typescript
throw new NotFoundException(APP_MESSAGES.ROLE.ROLE_NOT_FOUND);
```

## 10. Test Files

Test files đặt cạnh implementation:
- `services/*.service.spec.ts`
- `repositories/*.repository.spec.ts`

## 11. Không dùng `let` khi không reassign

```typescript
// ✅ ĐÚNG
const queryBuilder = this.repo.createQueryBuilder('role');

// ❌ SAI
let queryBuilder = this.repo.createQueryBuilder('role');
```

## 12. Import Types

Dùng `import type` khi chỉ import type để tránh circular dependency:

```typescript
import type { CreateRoleDto } from '../dtos/role.dto';
import type { Role } from '../../domain/entities/role.entity';
```

## 13. WebSocket Gateway Pattern (BẮT BUỘC)

Tất cả WebSocket phải đi qua `WebSocketModule` tập trung. **KHÔNG** tạo gateway riêng lẻ bên trong module nghiệp vụ.

### Cấu trúc thư mục:
```
modules/websocket/
  events/
    websocket.events.ts     # Tất cả event name constants
  gateways/
    *.gateway.ts            # Mỗi file = 1 namespace
  services/
    *-socket.service.ts     # Service emit event, được inject bởi module khác
  websocket.module.ts       # Export các services
```

### Pattern Gateway → Service:
```typescript
// Gateway: chỉ xử lý kết nối và lắng nghe event từ client
@WebSocketGateway({ namespace: '/dispatch', cors: { origin: '*' } })
export class DispatchGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor(private readonly dispatchSocketService: DispatchSocketService) {}

  afterInit(server: Server) {
    // ✅ BẮT BUỘC: Gán server cho service ngay khi init
    this.dispatchSocketService.setServer(server);
  }
}

// Service: chứa toàn bộ logic emit event — được inject vào module khác
@Injectable()
export class DispatchSocketService {
  private server: Server;

  setServer(server: Server) { this.server = server; }

  broadcastNewSos(provinceId: number, sos: any) {
    this.server?.to(`province:${provinceId}`).emit(DISPATCH_EVENTS.SOS_CREATED, sos);
  }
}
```

### Cách dùng ở module khác:
```typescript
// ✅ ĐÚNG — import WebSocketModule, inject service
@Module({ imports: [WebSocketModule] })
export class SosRequestModule {}

// Inject service
constructor(private readonly dispatchSocket: DispatchSocketService) {}

// Emit event
this.dispatchSocket.broadcastNewSos(provinceId, sos);
```

```typescript
// ❌ SAI — tạo gateway trong module nghiệp vụ
@Module({ providers: [MyOwnGateway] })
export class SosRequestModule {}
```

### Thêm namespace mới:
1. Tạo `gateways/{name}.gateway.ts`
2. Tạo `services/{name}-socket.service.ts`
3. Thêm vào `providers` và `exports` trong `websocket.module.ts`

## 14. Spatial Query Rules (PostGIS)

- Tất cả spatial query (`ST_Distance`, `ST_DWithin`, `<->`) chỉ được viết ở **Infrastructure layer** (`infrastructure/persistence/repositories/`)
- **KHÔNG** viết raw spatial SQL trong Service hay Controller
- Luôn cast `::geography` khi tính khoảng cách theo mét (không dùng `::geometry` thuần)
- Luôn tạo GiST index cho geometry columns: `@Index({ spatial: true })`

```typescript
// ✅ ĐÚNG — cast geography, dùng GiST <-> để sort
const point = `ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)`;
query
  .andWhere(`ST_DWithin(team.currentLocation::geography, ${point}::geography, :radius)`)
  .orderBy(`team.currentLocation <-> ${point}`)

// ❌ SAI — geometry degree, không chính xác theo mét
query.orderBy(`ST_Distance(team.currentLocation, ST_Point(${lng}, ${lat}))`)
```
