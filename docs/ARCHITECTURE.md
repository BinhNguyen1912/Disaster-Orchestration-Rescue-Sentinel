# Clean Architecture - Giải thích Chi tiết

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Luồng Dependency](#3-luồng-dependency)
4. [Chi tiết từng Layer](#4-chi-tiết-từng-layer)
5. [Ví dụ luồng dữ liệu](#5-ví-dụ-luồng-dữ-liệu)
6. [Tại sao không dùng Architecture khác](#6-tại-sao-không-dùng-architecture-khác)
7. [So sánh các Architecture](#7-so-sánh-các-architecture)
8. [Quy tắc quan trọng](#8-quy-tắc-quan-trọng)

---

## 1. Tổng quan

### Clean Architecture là gì?

Clean Architecture được giới thiệu bởi **Robert C. Martin (Uncle Bob)** vào năm 2012. Nó định nghĩa một cách tổ chức code sao cho:

> **Business logic không phụ thuộc vào UI, Database, hay bất kỳ external framework nào.**

Thay vào đó, các external concerns phụ thuộc vào business logic (Dependency Inversion).

### Nguyên tắc cốt lõi

```
┌─────────────────────────────────────────┐
│           Dependency Rule               │
│                                         │
│   Dependency chỉ hướng vào trong        │
│   (Domain, Application)                 │
│   KHÔNG bao giờ hướng ra ngoài          │
│   (Infrastructure, Presentation)       │
└─────────────────────────────────────────┘
```

---

## 2. Cấu trúc thư mục

### 2.1 Cấu trúc trong project

```
src/
├── modules/                      # Các module nghiệp vụ
│   ├── auth/
│   │   ├── domain/              # ✅ Entity, Repository Interface
│   │   ├── application/         # ✅ Use Case, Contract DTOs
│   │   ├── infrastructure/      # ✅ Repository Impl, Strategies
│   │   └── presentation/       # ✅ Controller, Validation DTOs
│   └── rescue-team/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
├── infrastructure/              # Cross-cutting infrastructure
│   ├── database/               # TypeORM connection, entities
│   └── mail/                  # External service
└── shared/                     # Tài nguyên dùng chung
    ├── common/                # Constants, DTOs
    └── core/                  # Enums, base interfaces
```

### 2.2 Mỗi Layer có vai trò gì?

| Layer              | Vai trò           | Chứa gì                                     |
| ------------------ | ----------------- | ------------------------------------------- |
| **Domain**         | Cốt lõi business  | Entity, Repository Interface, Domain Events |
| **Application**    | Use Cases         | Services, Command/Query, Contract DTOs      |
| **Infrastructure** | Kết nối bên ngoài | DB Repository Impl, Mail, External APIs     |
| **Presentation**   | HTTP/UI           | Controllers, Guards, Validation DTOs        |

---

## 3. Luồng Dependency

### 3.1 Sơ đồ Dependency

```
                    ┌─────────────────┐
                    │   Presentation  │  ← HTTP Request
                    │   (Controller)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Application   │  ← Use Case / Service
                    │   (Business)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     Domain      │  ← Entity, Interface
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
           ┌────────│ Infrastructure │  ← DB, Mail, External
           │        └────────────────┘
           │                │
    ┌──────▼──────┐  ┌──────▼──────┐
    │    Module   │  │   Shared    │
    │ Infra ( Impl) │  │  (Common)  │
    └─────────────┘  └─────────────┘
```

### 3.2 Dependency Inversion (DIP)

**Trước đây (Layered Architecture - SAI):**

```
Controller → Service → Repository (trực tiếp phụ thuộc)
```

**Bây giờ (Clean Architecture - ĐÚNG):**

```
Controller → Service → Repository INTERFACE ← Repository IMPLEMENTATION
                         (port)              (adapter) Adapter (hay đầy đủ là Interface Adapters) là lớp đóng vai trò như một bộ chuyển đổi dữ liệu.
```

```
        Application Layer
              ↓
         calls interface
              ↓
    ┌────────┴────────┐
    │  Repository    │  ← Interface định nghĩa ở Domain
    │  Interface     │
    └────────────────┘
              ↑
        implements
              │
    ┌────────┴────────┐
    │  Repository     │  ← Implementation ở Infrastructure
    │  Implementation │
    └────────────────┘
```

**Ví dụ thực tế:**

```typescript
// Domain r define repository interface (port)
export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  create(data: Partial<User>): Promise<User>;
  // ...
}

// Infrastructure implements interface (adapter)
export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    return this.ormRepository.findOne({ where: { id } });
  }
  // ...
}

// Application chỉ dùng interface, không biết gì về implementation
@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepo: IUserRepository,
  ) {}
}
```

---

## 4. Chi tiết từng Layer

### 4.1 Domain Layer (🟢 Cốt lõi - KHÔNG phụ thuộc layer nào)

**Mục đích:** Chứa logic nghiệp vụ thuần túy, không liên quan đến framework hay database.

**Chứa:**

- **Entity:** Đối tượng business (User, RescueTeam, Order...)
- **Repository Interface:** Định nghĩa "port" để truy cập dữ liệu
- **Value Objects:** Đối tượng không có identity (Address, Money...)
- **Domain Events:** Sự kiện nghiệp vụ (UserCreated, OrderPlaced...)
- **Domain Services:** Logic nghiệp vụ không thuộc entity nào

**Ví dụ Entity:**

```typescript
// src/modules/auth/domain/entities/user.ts
export class User {
  id: number;
  fullName: string;
  email: string;
  password: string; // hashed
  trustScore: number;

  getActiveRoleId(): number {
    // Business logic thuần túy
    return this.roles?.[0]?.roleId;
  }

  isTrusted(): boolean {
    return this.trustScore >= 50;
  }
}
```

**Ví dụ Repository Interface:**

```typescript
// src/modules/auth/domain/repositories/user.repository.interface.ts
export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByIdentifier(identifier: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: number, data: Partial<User>): Promise<User | null>;
  assignRole(
    userId: number,
    roleId: number,
    provinceId: number,
    assignedBy: number,
  ): Promise<void>;
}
```

**Tại sao lại có Repository Interface ở Domain?**

Vì Domain là "trung tâm", không phụ thuộc gì. Nhưng Application layer cần một cách để truy cập dữ liệu. Giải pháp: định nghĩa interface ở Domain, Implementation ở Infrastructure.

```
Domain (interface)           ── được implement bởi ──►  Infrastructure (impl)
     │                                                            │
     │                                                            │
     │    Application chỉ cần biết interface                      │
     │    (không cần biết implementation cụ thể)                 │
     ▼                                                            ▼
┌─────────────┐                                        ┌─────────────────┐
│   Domain    │                                        │  Infrastructure │
│   Layer     │  ◄──────── Dependency Inversion ──────  │     Layer       │
└─────────────┘                                        └─────────────────┘
```

### 4.2 Application Layer (🟢 Use Cases - chỉ phụ thuộc Domain)

**Mục đích:** Chứa các Use Cases (các thao tác nghiệp vụ cụ thể).

**Chứa:**

- **Service:** Implement Use Cases
- **DTOs:** Data Transfer Objects (contract giữa layers)
- **Service Interface:** Định nghĩa các operations

**Ví dụ Service:**

```typescript
// src/modules/rescue-team/application/services/rescue-team.service.ts
@Injectable()
export class RescueTeamService implements IRescueTeamService {
  constructor(
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    @Inject('IRescueTeamMemberRepository')
    private readonly memberRepo: IRescueTeamMemberRepository,
  ) {}

  async create(
    dto: CreateRescueTeamDto,
    userId: number,
  ): Promise<RescueTeamEntity> {
    // Use Case: Tạo đội cứu hộ mới
    // Validation logic có thể đặt ở đây hoặc domain

    const team = await this.teamRepo.create({
      ...dto,
      createdBy: userId,
      activeCasesCount: 0,
      totalMissions: 0,
    });

    return team;
  }
}
```

**Ví dụ Application DTO (Contract):**

```typescript
// src/modules/rescue-team/application/dtos/create-rescue-team.dto.ts
export interface CreateRescueTeamDto {
  name: string;
  teamType: TeamType;
  provinceId: number;
  adminUnitId: number;
  baseLocation?: { type: 'Point'; coordinates: [number, number] };
  maxCapacity?: number;
}
```

### 4.3 Infrastructure Layer (🔵 Kết nối bên ngoài - phụ thuộc Domain)

**Mục đích:** Triển khai các interfaces định nghĩa ở Domain.

**Chứa:**

- **Repository Implementations:** Kết nối TypeORM/MongoDB
- **External Services:** Mail, SMS, Payment gateways
- **Strategies:** JWT strategy, local strategy cho auth

**Ví dụ Repository Implementation:**

```typescript
// src/modules/auth/infrastructure/persistence/repositories/user.repository.ts
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly ormRepo: Repository<UserEntity>,
  ) {}

  async findByIdentifier(identifier: string): Promise<User | null> {
    const user = await this.ormRepo.findOne({
      where: [{ phone: identifier }, { email: identifier }],
    });
    return user ? this.mapToDomain(user) : null;
  }
}
```

### 4.4 Presentation Layer (🔴 HTTP Adapter - chỉ phụ thuộc Application)

**Mục đích:** Xử lý HTTP requests/responses.

**Chứa:**

- **Controllers:** Nhận request, gọi service, trả response
- **Guards:** Kiểm tra quyền, authentication
- **Validation DTOs:** Dùng class-validator cho input validation
- **Response DTOs:** Format response cho client

**Ví dụ Controller:**

```typescript
// src/modules/rescue-team/presentation/controllers/rescue-team.controller.ts
@ApiTags('Rescue Teams')
@Controller('rescue-teams')
@UseGuards(JwtAuthGuard)
export class RescueTeamController {
  constructor(private readonly service: RescueTeamService) {}

  @Post()
  @RequirePermissions(Permissions.RESCUE_TEAM_CREATE)
  async create(
    @Body(new ValidationPipe({ transform: true }))
    dto: CreateRescueTeamValidationDto,
    @Request() req: any,
  ) {
    // Controller chỉ là adapter - mapping và validation
    const result = await this.service.create(
      dto as CreateRescueTeamDto,
      req.user.userId,
    );
    return BaseResponseDto.fromEntity(result);
  }
}
```

**Ví dụ Validation DTO (Presentation):**

```typescript
// Chỉ dùng class-validator, KHÔNG chứa business logic
export class CreateRescueTeamValidationDto {
  @IsInt()
  @IsNotEmpty()
  provinceId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TeamType)
  @IsNotEmpty()
  teamType: TeamType;
}
```

---

## 5. Ví dụ luồng dữ liệu

### 5.1 Create Rescue Team Flow

```
1. Client gửi POST /rescue-teams
   Body: { name: "Team A", teamType: "FIRE", provinceId: 1 }

2. Controller nhận request
   - Validate input bằng ValidationPipe
   - Map CreateRescueTeamValidationDto → CreateRescueTeamDto (contract)

3. Service xử lý Use Case
   - Kiểm tra specializationIds hợp lệ
   - Gọi teamRepo.create()

4. Repository Interface (port)
   - Không biết gì về DB

5. Repository Implementation (adapter)
   - TypeORM tạo record trong DB

6. Response ngược lại
   Service → Controller → Client
```

### 5.2 Code Flow cho Create Rescue Team

```typescript
// ====== PRESENTATION LAYER ======
// Controller nhận HTTP request
@Post()
async create(@Body() dto: CreateRescueTeamValidationDto) {
  const result = await this.service.create(dto, userId);
  return BaseResponseDto.fromEntity(result);
}

// ====== APPLICATION LAYER ======
// Service chứa Use Case
class RescueTeamService {
  async create(dto: CreateRescueTeamDto, userId: number) {
    // Business logic validation
    const specs = await this.specRepo.findByIds(dto.specializationIds);

    // Gọi repository qua interface
    return this.teamRepo.create({ ...dto, createdBy: userId });
  }
}

// ====== DOMAIN LAYER ======
// Interface định nghĩa contract
interface IRescueTeamRepository {
  create(data: Partial<RescueTeamEntity>): Promise<RescueTeamEntity>;
}

// ====== INFRASTRUCTURE LAYER ======
// Implementation cụ thể
class RescueTeamRepository implements IRescueTeamRepository {
  async create(data) {
    return this.ormRepo.save(data); // TypeORM
  }
}
```

---

## 6. Tại sao không dùng Architecture khác

### 6.1 Layered Architecture (3-tier, N-tier) - Phổ biến nhưng có vấn đề

```
┌──────────┐
│    UI    │  ← Presentation
├──────────┤
│ Service  │  ← Business Logic
├──────────┤
│   Data   │  ← Database
└──────────┘
```

**Vấn đề:**

- ❌ UI phụ thuộc Service, Service phụ thuộc Database
- ❌ Khó test vì business logic phụ thuộc vào DB
- ❌ Thay đổi UI (React → Vue) ảnh hưởng business logic
- ❌ Business logic bị "ôm" trong Service, không tách biệt

**Khi nào dùng Layered:**

- Project nhỏ, đơn giản
- Team nhỏ, không cần scale
- Không cần test cao

### 6.2 Monolithic Architecture

**Vấn đề:**

- ❌ Tất cả code trong một project lớn
- ❌ Modifiy một module ảnh hưởng module khác
- ❌ Deploy toàn bộ khi thay đổi nhỏ
- ❌ Khó scale theo module

### 6.3 Hexagonal Architecture (Ports & Adapters)

```
         ┌───────────────────────┐
         │     Application      │
         │   (Business Logic)   │
         └──────────┬───────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───┴───┐      ┌────┴────┐     ┌────┴────┐
│ Port  │      │  Port   │     │  Port   │
│ (In)  │      │ (Out)   │     │ (Out)   │
└───┬───┘      └────┬────┘     └────┬────┘
    │               │               │
┌───┴───┐      ┌────┴────┐     ┌────┴────┐
│Adapter│      │ Adapter │     │ Adapter│
│ (API) │      │  (DB)   │     │ (Mail) │
└───────┘      └─────────┘     └────────┘
```

**Khác với Clean Architecture:**

- Hexagonal dùng "ports" thay vì interfaces
- Clean Architecture tổ chức theo layers rõ ràng hơn
- Clean Architecture phù hợp với NestJS module system

### 6.4 Event-Driven Architecture

**Dùng khi:**

- Microservices
- Xử lý real-time events
- CQRS pattern

**Quá phức tạp cho:**

- Project nhỏ/trung bình
- Single codebase
- Team nhỏ

### 6.5 SOA (Service-Oriented Architecture)

**Vấn đề:**

- Ít phù hợp với microservices nhỏ
- ESB (Enterprise Service Bus) trở thành bottleneck
- Quá nặng cho most use cases

---

## 7. So sánh các Architecture

| Tiêu chí               | Clean Arch | Layered | Hexagonal  | Event-Driven |
| ---------------------- | ---------- | ------- | ---------- | ------------ |
| **Phân tách concerns** | ⭐⭐⭐⭐⭐ | ⭐⭐    | ⭐⭐⭐⭐   | ⭐⭐⭐       |
| **Testability**        | ⭐⭐⭐⭐⭐ | ⭐⭐    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐       |
| **Độ phức tạp**        | Trung bình | Thấp    | Trung bình | Cao          |
| **Scale**              | ⭐⭐⭐⭐   | ⭐⭐    | ⭐⭐⭐     | ⭐⭐⭐⭐⭐   |
| **Team size**          | 1-20       | 1-5     | 3-15       | 10+          |
| **Learning curve**     | Trung bình | Thấp    | Cao        | Rất cao      |

### Clean Architecture phù hợp khi:

✅ Project có domain logic phức tạp  
✅ Cần testability cao (unit tests, integration tests)  
✅ Team từ 2-20 developers  
✅ Cần maintain lâu dài  
✅ Domain có nhiều business rules

### Clean Architecture không phù hợp khi:

❌ Project rất nhỏ (1-2 tuần)  
❌ POC/MVP cần prototype nhanh  
❌ Team không quen với dependency management  
❌ Không có nhiều business logic (CRUD only)

---

## 8. Quy tắc quan trọng

### 8.1 Dependency Rule (BẮT BUỘC)

```
Domain ───► Application ───► Infrastructure
                                 ▲
                                 │
                           phụ thuộc
                          (implement)

Domain ───► Application ───► Presentation
                                     ▲
                                     │
                               KHÔNG phụ thuộc
```

**Tổng kết:**

1. `domain/` KHÔNG phụ thuộc layer nào
2. `application/` chỉ phụ thuộc `domain/`
3. `infrastructure/` phụ thuộc `domain/` (implement interface)
4. `presentation/` chỉ phụ thuộc `application/`

### 8.2 Cross-layer Communication

```
✅ ĐÚNG: Presentation → Application → Domain
❌ SAI:   Presentation → Infrastructure (trực tiếp)
❌ SAI:   Application → Presentation
❌ SAI:   Domain → Application
```

### 8.3 DTOs Location Rule

```
Application/DTOs (contract)     ←  Interface cho layers bên ngoài
Presentation/DTOs (validation) ←  Chỉ class-validator, không business logic
```

**KHÔNG BAO GIỜ:**

```typescript
// ❌ SAI - Application import từ Presentation
import { CreateRescueTeamDto } from '../../presentation/dtos';

// ✅ ĐÚNG - Presentation import contract từ Application
import type { CreateRescueTeamDto } from '../../application/dtos';
```

### 8.4 Naming Convention

| Layer          | Type              | Suffix             | Ví dụ                           |
| -------------- | ----------------- | ------------------ | ------------------------------- |
| Application    | Contract DTO      | `Dto`              | `CreateRescueTeamDto`           |
| Presentation   | Validation DTO    | `ValidationDto`    | `CreateRescueTeamValidationDto` |
| Application    | Service Interface | `ServiceInterface` | `IRescueTeamService`            |
| Application    | Service           | `Service`          | `RescueTeamService`             |
| Infrastructure | Repository Impl   | `Repository`       | `RescueTeamRepository`          |

### 8.5 Interfaces ở đâu?

**Repository Interfaces:** Luôn ở `domain/`

- Vì domain là center, infrastructure phải adapt vào domain

**Service Interfaces:** Ở `application/interfaces/`

- Vì đây là contract để presentation giao tiếp với application

---

## 9. FAQ

### Q: Tại sao modules lại có cấu trúc giống nhau?

**A:** Để consistency và dễ maintain. Khi team member chuyển từ module auth sang rescue-team, họ biết:

- Domain interfaces ở đâu
- Application services ở đâu
- Controller ở đâu

### Q: Infrastructure nằm ở đâu?

**A:** Có 2 loại:

1. **Root `infrastructure/`**: Cross-cutting (DB connection, Mail service)
2. **Module `infrastructure/`**: Module-specific implementations (UserRepository, AuthRepository)

### Q: Shared có gì?

**A:** Cross-cutting resources:

- Enums (TeamType, Gender...)
- Constants (messages, permissions...)
- Base DTOs (BaseResponseDto)
- Middlewares

### Q: Khi nào dùng `interface` vs `class` cho DTO?

**A:**

- **Contract (Application DTOs):** `interface` - vì chỉ là contract
- **Validation (Presentation DTOs):** `class` - vì cần decorator cho validation

### Q: Tại sao cần cả Application DTO và Presentation DTO?

**A:**

```
Client Request → Validation DTO (Presentation) → Contract DTO (Application) → Service
                      ↓                                    ↓
              class-validator                       interface/type
              (transform, parse)                  (business contract)
```

---

## 10. Tài liệu tham khảo

1. **Clean Architecture** - Robert C. Martin (2012)
2. **Domain-Driven Design** - Eric Evans (2003)
3. **Implementing Domain-Driven Design** - Vernon Vaughn (2013)
4. **NestJS Documentation** - Official.guides
5. **Architecture Patterns with Python** - Harry Percival & Bob Gregory

---

## Update History

- 2026-05-28: Initial architecture documentation
