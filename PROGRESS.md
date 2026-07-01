# 📊 Báo cáo Tiến độ Dự án — Disaster Rescue Management System (Backend)

> **Lần cập nhật gần nhất:** 2026-07-01
> **Người cập nhật:** AI Assistant (cập nhật sau khi tích hợp TomTom Traffic)
> **Trạng thái tổng:** 🟢 **Phase 3.5 — Spatial NNS + TomTom Traffic Integration + WebSockets**

---

## 🗂️ Tổng quan Phases

| Phase | Tên | Tiến độ | Trạng thái |
|-------|-----|---------|-----------|
| 1 | Hạ tầng & Foundation | ██████████ 100% | ✅ Hoàn thành |
| 2 | Auth & Core Modules | ██████████ 100% | ✅ Hoàn thành |
| 3 | Nghiệp vụ chính (SOS, Rescue, Dispatch) | ██████████ 100% | ✅ Hoàn thành |
| 3.5 | Spatial NNS + TomTom Traffic + WebSocket | ████████░░ 80% | 🟢 Hoàn thành Tích hợp TomTom |
| 4 | Mở rộng (Donation, Alert, IoT, Message) | ░░░░░░░░░░ 0% | 🔲 Chưa bắt đầu |

---

## ✅ Phase 1: Hạ tầng & Foundation

| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 1.1 | Docker Compose (PostgreSQL + PostGIS) | ✅ Hoàn thành | `docker-compose.yml` đã có |
| 1.2 | Cài dependencies (NestJS, TypeORM, pg, passport-jwt, bcrypt...) | ✅ Hoàn thành | `package.json` đầy đủ |
| 1.3 | Cấu trúc thư mục Feature-Based Modular | ✅ Hoàn thành | `modules/`, `shared/`, `infrastructure/` |
| 1.4 | Config module (env validation, DB connection) | ✅ Hoàn thành | `ConfigModule.forRoot()` global |
| 1.5 | Base Repository pattern | ✅ Hoàn thành | `base.repository.ts` + `IBaseRepository` |
| 1.6 | Shared Enums (31 enums) | ✅ Hoàn thành | Tất cả enums trong `shared/core/enums/` |
| 1.7 | Health check endpoint | ✅ Hoàn thành | `@nestjs/terminus`, `GET /health` |
| 1.8 | ESLint + Prettier + Husky + Commitlint | ✅ Hoàn thành | Lint-staged chạy trước mỗi commit |
| 1.9 | Swagger UI (`/api/docs`) | ✅ Hoàn thành | Bearer Auth + full documentation |
| 1.10 | Seed data (63 tỉnh + Admin mặc định + Roles) | ✅ Hoàn thành | Script `npm run seed` |

---

## 🟡 Phase 2: Auth & Core Modules

### 2.1 Database Entities (Tầng Infrastructure)

Toàn bộ bảng đã được định nghĩa TypeORM Entity với `synchronize: true` (dev mode):

| Entity | Bảng DB | Trạng thái |
|--------|---------|-----------|
| `UserEntity` | `user` | ✅ Hoàn thành |
| `ProvinceEntity` | `province` | ✅ Hoàn thành |
| `AdministrativeUnitEntity` | `administrative_unit` | ✅ Hoàn thành |
| `RoleEntity` | `role` | ✅ Hoàn thành |
| `UserRoleEntity` | `user_role` | ✅ Hoàn thành |
| `RefreshTokenEntity` | `refresh_token` | ✅ Hoàn thành |
| `PermissionEntity` | `permission` | ✅ Hoàn thành |
| `RolePermissionEntity` | `role_permission` | ✅ Hoàn thành |
| `DeviceEntity` | `device` | ✅ Entity có, chưa có logic |
| `AuditLogEntity` | `audit_log` | ✅ Entity có, chưa có logic |
| `HouseholdProfileEntity` | `household_profile` | ✅ Entity có, chưa có logic |
| `RescueTeamEntity` | `rescue_team` | ✅ Hoàn thành (Rescue Module) |
| `RescueTeamMemberEntity` | `rescue_team_member` | ✅ Hoàn thành (Rescue Module) |
| `TeamSpecializationEntity` | `team_specialization` | ✅ Hoàn thành (Rescue Module) |
| `SosRequestEntity` | `sos_request` | ✅ Hoàn thành (SOS Request Module) |
| `FloodReportEntity` | `flood_report` | ✅ Entity có, chưa có logic |
| `CasualtyEntity` | `casualty` | ✅ Entity có, chưa có logic |
| `DisasterEventEntity` | `disaster_event` | ✅ Entity có, chưa có logic |
| `DonationEntity` | `donation` | ✅ Entity có, chưa có logic |
| `DonationCampaignEntity` | `donation_campaign` | ✅ Entity có, chưa có logic |
| `MessageEntity` | `message` | ✅ Entity có, chưa có logic |
| `MessageReadEntity` | `message_read` | ✅ Entity có, chưa có logic |
| `FloodZoneEntity` | `flood_zone` | ✅ Entity có, chưa có logic |
| `InfrastructureLayerEntity` | `infrastructure_layer` | ✅ Entity có, chưa có logic |
| `WeatherAlertEntity` | `weather_alert` | ✅ Entity có, chưa có logic |
| `IotDeviceEntity` | `iot_device` | ✅ Entity có, chưa có logic |
| `DutyLogEntity` | `duty_log` | ✅ Entity có, chưa có logic |
| `TeamAchievementEntity` | `team_achievement` | ✅ Entity có, chưa có logic |

### 2.2 Module Xác thực (AuthModule) ✅

**Auth Contracts** (2026-05-28):
- ✅ `auth.contracts.ts`: `BaseResponse<T>`, `AuthLoginResponse`, `AuthUserResponse`, `RegisterInput`, `AdminRegisterInput`, `toAuthUserResponse(user)`

Đây là module đã hoàn thiện nhất trong hệ thống.

| Tính năng | Endpoint | Trạng thái |
|-----------|----------|-----------|
| Đăng nhập | `POST /auth/login` | ✅ Hoàn thành |
| Đăng ký tài khoản | `POST /auth/register` | ✅ Hoàn thành |
| Tạo tài khoản nhân viên (Admin) | `POST /auth/admin/register` | ✅ Hoàn thành |
| Cấp lại Access Token | `POST /auth/refresh` | ✅ Hoàn thành |
| Đăng xuất | `POST /auth/logout` | ✅ Hoàn thành |
| Quên mật khẩu (OTP) | `POST /auth/forgot-password` | ✅ Hoàn thành |
| Đặt lại mật khẩu | `POST /auth/reset-password` | ✅ Hoàn thành |

**Cơ chế bảo mật đã áp dụng:**
- ✅ JWT Access Token (hạn ngắn, mặc định 15 phút)
- ✅ Refresh Token bằng UUID, lưu vào DB bảng `refresh_token`
- ✅ **Rotate Refresh Token** — token cũ bị revoke sau mỗi lần dùng
- ✅ Mật khẩu mã hóa bằng `bcrypt` (salt rounds = 10)
- ✅ OTP 6 số, hết hạn sau 5 phút
- ✅ OTP gửi qua **Email thực tế** bằng `@nestjs-modules/mailer` + SMTP Gmail
- ✅ Đăng xuất/Reset mật khẩu tự động revoke toàn bộ phiên
- ✅ LocalStrategy (Passport) xác thực bằng SĐT hoặc Email

### 2.3 Phân quyền (RBAC)

**Hệ thống vai trò (Roles):**

| Vai trò | Level | Mô tả |
|---------|-------|-------|
| `SYSTEM_ADMIN` | 100 | Quản trị viên toàn hệ thống |
| `PROVINCE_ADMIN` | 80 | Quản trị viên cấp Tỉnh/Thành phố |
| `RESCUE_TEAM_LEADER` | 50 | Đội trưởng đội cứu hộ |
| `USER` | 10 | Người dùng thường |

**Cơ chế RBAC:**
- ✅ `JwtStrategy` — giải mã token, inject `userId`, `provinceId`, `roleId` vào request
- ✅ `JwtAuthGuard` — bảo vệ các endpoint yêu cầu đăng.
- ✅ `AccessGuard` & `@Public()` — custom guard toàn cục
- ✅ `@CurrentUser()` — decorator lấy thông tin user/payload đã xác thực tring controller.
- ✅ **JWT Payload** chứa: `sub` (userId), `provinceId`, `roleId`, `email`
- ✅ `getActiveRoleId(provinceId?)` — hàm nghiệp vụ trong Domain Entity `User`, tự động lấy đúng roleId theo tỉnh thành
- ✅ **Multi-tenant**: Một user có thể giữ nhiều vai trò ở nhiều tỉnh khác nhau (bảng `user_role` làm cầu nối)
- ✅ **Permission Guard** (`@RequirePermissions()` decorator)
- ✅ **Province Scope** (explicit trong Service)
- ✅ **Permission Sync Script** (`npm run sync:permissions`)

---

## 🟢 Phase 3: Nghiệp vụ chính (Đang làm)

### ✅ Rescue Team Module — Hoàn thành 2026-05-22, cập nhật 2026-06-11

- ✅ `RescueTeamEntity`, `RescueTeamMemberEntity` + `ITeamSpecializationRepository`
- ✅ `RescueTeamRepository` + `RescueTeamMemberRepository`
- ✅ Domain Entities: `RescueTeam`, `RescueTeamMember` (`modules/rescue-team/domain/entities/`)
- ✅ `RescueTeamService` (11 endpoints, business logic đầy đủ)
- ✅ `RescueTeamController` (11 endpoints)
- ✅ `RescueTeamModule` import `TeamSpecializationModule`
- ✅ `TeamSpecialization` seed data (13 specs)
- ✅ Unit test **89 cases** (gồm cả RescueTeam và RescueTeamMember) — tất cả passed (2026-06-11)
- ✅ Refactor DTOs (`CreateRescueTeamDto`, `UpdateRescueTeamDto`, `AddMemberDto`)
- ✅ `RescueTeamContracts` interface
- ✅ ManyToMany bidirectional relationship với `TeamSpecializationEntity`
- ✅ **Flexible Member Support (2026-06-05)**:
  - `RescueTeamMemberEntity.userId` nullable (1 user có thể thuộc nhiều đội)
  - Hỗ trợ thêm thành viên chỉ với `citizenName` + `citizenPhone` (không cần user account)
  - Thêm trường `leaderCitizenName`, `leaderPhone` trong `RescueTeamEntity`
  - Bỏ validation chuyên nghiệp cho đội tự phát (VOLUNTEER_SPONTANEOUS)
  - **`teamType` now optional** - chỉ required khi dùng với specialization validation
  - Triết lý "Mở trước, Siết sau" - ưu tiên tốc độ trong tình huống khẩn cấp

### ✅ Location Module — Hoàn thành 2026-06-05

- ✅ `LocationService` with location-related business logic
- ✅ `LocationRepositoryInterface` + `LocationRepositoryImpl`
- ✅ `LocationController` for location endpoints
- ✅ Seed data: provinces, province-centers, administrative-units

### ✅ Role Module — Hoàn thành 2026-06-05

- ✅ `RoleService` with full CRUD operations
- ✅ `RoleRepositoryInterface` + `RoleRepositoryImpl`
- ✅ `RoleController` for role management endpoints
- ✅ `RoleEntity` domain entity
- ✅ Role DTOs (role.dto.ts, role-response.dto.ts)

### ✅ Team Specialization Module — Hoàn thành 2026-06-05 (Tách riêng, consolidate vào shared)

- ✅ Tách `TeamSpecialization` thành module độc lập (`modules/team-specialization/`)
- ✅ `ITeamSpecializationRepository` interface + `TeamSpecializationRepositoryImpl`
- ✅ `TeamSpecializationService` implements `ITeamSpecializationService` interface
- ✅ `TeamSpecializationController` với CRUD endpoints:
  - `GET /team-specializations` (filter: teamType, isActive)
  - `GET /team-specializations/:id`
  - `POST /team-specializations`
  - `PATCH /team-specializations/:id`
  - `DELETE /team-specializations/:id` (soft delete)
- ✅ `TeamSpecializationEntity` có `@ManyToMany` inverse side (`rescueTeams`)
- ✅ Export `ITeamSpecializationRepository` để `RescueTeamModule` có thể inject
- ✅ **Consolidate Entity (2026-06-05)**: `TeamSpecialization` entity chuyển vào `shared/domain/entities/team-specialization.entity.ts` để tránh duplicate giữa các modules

### ✅ SOS Request Module & R2 Upload Integration — Hoàn thành 2026-06-12

- ✅ `SosRequestEntity` schema & data definitions.
- ✅ `SosRequestRepository` & custom spatial queries with PostGIS.
- ✅ `SosRequestService` & controller endpoints (`/api/v1/sos-requests` single/nearby/status/assign/cancel).
- ✅ `DistanceBasedDispatchStrategy` implementing dynamic dispatch logic.
- ✅ `StorageService` & `StorageModule` integrating Cloudflare R2 client.
- ✅ `UploadController` providing `/api/v1/upload/single` and `/api/v1/upload/multiple` with custom `upload.helper.ts` (size/type validation).
- ✅ Unit & Integration tests for SOS request, R2 upload, and Guest SOS flows.
- ✅ Postman collection updated with all SOS Request and Upload endpoints.

### 🔵 Phase 3.5: Spatial NNS + WebSocket Real-time Dispatch (Đang triển khai 2026-06-15)

#### ✅ Đã hoàn thành:
- ✅ **BA Analysis**: Phân tích 8 thuật toán Spatial NNS, chọn R-Tree (GiST) + Expanding Radius
- ✅ **WebSocket Module** (`src/modules/websocket/`) — module tập trung quản lý tất cả gateways
  - ✅ `DispatchGateway` — namespace `/dispatch` (điều phối cứu hộ, SOS tracking)
  - ✅ `NotificationGateway` — namespace `/notification` (push notification đến user)
  - ✅ `DispatchSocketService` — service emit event cho dispatch
  - ✅ `NotificationSocketService` — service emit event cho notification
  - ✅ `websocket.events.ts` — constants tất cả event names
  - ✅ `main.ts` đã thêm `IoAdapter` (Socket.io adapter)
  - ✅ `AppModule` đã import `WebSocketModule`
- ✅ Cài packages: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`

#### 🔲 Còn lại:
- [ ] Thêm `@Index({ spatial: true })` vào các entity có geometry column
- [ ] Implement `findNearestAvailable()` + `findNearbyTeams()` trong `RescueTeamRepository`
- [ ] Tạo `DispatchService` với Expanding Radius logic (5km → 10km → 20km → 40km)
- [ ] Tích hợp `DispatchSocketService` vào `SosRequestService` (emit khi dispatch)
- [ ] Tích hợp `NotificationSocketService` vào các service cần push notification
- [ ] SOS State Machine transitions (PENDING_DISPATCH → TEAM_ASSIGNED → TEAM_MOVING → RESCUING → COMPLETED)
- [ ] Test Spatial Query với PostGIS

### 🔲 Các module khác (Phase 3 tiếp theo)

- [ ] Module Flood Report (báo cáo lũ, xác minh)
- [ ] Module Casualty (thương vong)
- [ ] Module Disaster Event (sự kiện thiên tai tổng hợp)

---

## 🔲 Phase 4: Mở rộng (Chưa bắt đầu)

- [ ] Module Donation (quyên góp, chiến dịch)
- [ ] Module Weather Alert (cảnh báo thời tiết, IoT)
- [ ] Module Message (nhắn tin nội bộ)
- [ ] Module Audit Log (nhật ký hành động)
- [ ] GIS Layers (vùng ngập, hạ tầng)

---

## 📋 Kiến trúc mới — Feature-Based Modular (2026-05-27)

Đã refactor từ **layer-based** sang **feature-based modular**:

```
src/
├── shared/                             ← SHARED kernel
│   ├── common/constants/              # Messages, permissions, inject names
│   ├── common/middlewares/           # Logger middleware
│   └── core/enums/                   # 31 business enums
│
├── infrastructure/database/            ← SHARED infrastructure
│   ├── database.module.ts            # @Global() TypeORM config
│   ├── entities/                     # 28 TypeORM entities (single source)
│   │   └── index.ts                  # Barrel export
│   └── seeds/
│
├── modules/
│   ├── auth/                         # AUTH MODULE
│   │   ├── domain/
│   │   │   ├── entities/User.ts      # Pure domain class (business logic)
│   │   │   ├── interfaces/
│   │   │   └── repositories/         # Repository interfaces
│   │   ├── application/services/    # AuthService, AccessService
│   │   ├── infrastructure/
│   │   │   ├── auth/                 # Guards, strategies
│   │   │   └── persistence/repositories/ # TypeORM impls
│   │   └── presentation/controllers + dtos
│   │
│   ├── rescue-team/                   # RESCUE TEAM MODULE
│   │   ├── domain/repositories/      # Repository interfaces
│   │   ├── domain/entities/         # Domain entities (RescueTeam, RescueTeamMember)
│   │   ├── application/services/     # Business logic
│   │   ├── application/dtos/         # DTOs, contracts
│   │   ├── infrastructure/persistence/repositories/
│   │   └── presentation/
│   │
│   ├── sos-request/                   # SOS REQUEST MODULE
│   │   ├── domain/repositories/
│   │   ├── domain/entities/
│   │   ├── application/services/     # SosRequestService, DispatchService (WIP)
│   │   ├── infrastructure/persistence/repositories/
│   │   └── presentation/
│   │
│   ├── websocket/                     # WEBSOCKET MODULE (2026-06-15) ← MỚI
│   │   ├── events/
│   │   │   └── websocket.events.ts   # Constants toàn bộ event names
│   │   ├── gateways/
│   │   │   ├── dispatch.gateway.ts   # namespace /dispatch
│   │   │   └── notification.gateway.ts # namespace /notification
│   │   ├── services/
│   │   │   ├── dispatch-socket.service.ts     # Emit events /dispatch
│   │   │   └── notification-socket.service.ts # Emit events /notification
│   │   └── websocket.module.ts       # Module tập trung, export services
│   │
│   ├── location/                      # LOCATION MODULE
│   ├── role/                          # ROLE MODULE
│   ├── health/
│   └── upload/                        # MEDIA UPLOAD MODULE
│
└── app.module.ts
```

**Nguyên tắc:**
- `domain/` = pure classes + interfaces (no @Entity)
- `infrastructure/` = implementations (TypeORM, external services)
- `application/` = business logic
- Module có thể deploy độc lập như microservices

---

## 📅 Lịch sử buổi code

| Ngày | Nội dung công việc |
|------|---------|
| 2026-07-01 | **Tích hợp TomTom Traffic & Định Tuyến Tránh Ngập Lũ**: 1) Thiết kế dịch vụ `TomTomTrafficService` hỗ trợ định tuyến tính kẹt xe, in-memory caching làm tròn tọa độ 4 chữ số thập phân, clamp hệ số kẹt xe `[1.0, 5.0]`, bộ đếm hạn ngạch API hàng ngày reset chuẩn theo giờ UTC. 2) Cải tiến chiến lược điều phối `DistanceBasedDispatchStrategy` kết hợp né đa giác ngập lụt (`avoidPolygons` lấy từ `FloodZoneEntity`) và kẹt xe TomTom, áp dụng công thức xếp hạng 4 trọng số linh hoạt. 3) Bổ sung 4 trường ảo (`etaIdealMinutes`, `etaRealisticMinutes`, `trafficDelayMinutes`, `trafficNote`) lan truyền tự động từ dispatch orchestrator về REST response và Socket. 4) Viết bộ test suite đầy đủ `tomtom-traffic.service.spec.ts` cho các biên clamp kẹt xe cực đại/âm và chế độ fallback optional. 5) Sửa đổi unit test controller và hoàn thành chạy 153 unit test thành công 100%. 6) Git commit & branch merge đẩy code BE/FE lên GitHub. |
| 2026-06-15 | **Spatial NNS Analysis + WebSocket Module Setup**: 1) Phân tích 8 thuật toán Spatial Nearest Neighbor Search (Brute Force, R-Tree/GiST, KD-Tree, Quadtree, Geohash, H3, LSH, Expanding Radius) — chọn R-Tree (GiST) + Expanding Radius. 2) Viết tài liệu BA đầy đủ `docs/spatial_nns_analysis.md` (Business Problem, Business Goals, Stakeholders, FR/NFR, Domain Model, Business Rules, Failure Scenarios). 3) Tạo `WebSocketModule` tập trung với 2 namespaces: `/dispatch` (DispatchGateway + DispatchSocketService) và `/notification` (NotificationGateway + NotificationSocketService). 4) Cài `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`. 5) Thêm `IoAdapter` vào `main.ts`. 6) Kiểm tra và xác nhận Socket CHƯA setup trước đó (zero-from-scratch). |
| 2026-06-12 | **Implement SOS Request Module & R2 Media Upload**: 1) Thiết lập Cloudflare R2 Upload qua `StorageService` và `UploadController` cùng `upload.helper.ts` cho phép xử lý in-memory streams. 2) Xây dựng `SosRequestModule` hỗ trợ đầy đủ quy trình gửi SOS (kể cả Guest/Rate limit), tự hủy, phân bổ đội (auto-dispatch bằng PostGIS `ST_Distance`), đổi đội (reassign) và tìm kiếm lân cận. 3) Cập nhật Postman collection với 8 use cases mới. 4) Viết unit & E2E integration tests. |
| 2026-06-11 | **Fix & Migrate Unit Tests**: Di chuyển các unit test liên quan đến Member từ `RescueTeamService` sang `RescueTeamMemberService` để tương thích hoàn toàn với cấu trúc service mới. Sửa phương thức `delete` trong unit test của `RescueTeamService` để bỏ kiểm tra active members dư thừa. Tất cả 89 tests đã PASS thành công. |
| 2026-06-05 | **Make teamType optional**: 1) Update `CreateRescueTeamDto.teamType` thành optional. 2) Update service validation chỉ check specialization-teamType match khi teamType được cung cấp. 3) Update `RescueTeamEntity.teamType` nullable. 4) Thêm test case mới (47 total). 5) Update Postman với endpoint tạo team không cần teamType (VOLUNTEER_SPONTANEOUS). |
| 2026-06-05 | **Flexible Member System + Unit Tests (46 cases)**: 1) Fix TypeScript errors sau khi consolidate TeamSpecialization. 2) Update `RescueTeamMemberEntity` - `userId` nullable, thêm `citizenName`, `citizenPhone`. 3) Update `RescueTeamEntity` thêm `leaderCitizenName`, `leaderPhone`. 4) Update `RescueTeamService.addMember()` hỗ trợ thêm thành viên chỉ với citizenName (không cần userId). 5) Fix logic `removeMember`, `updateMemberRole`, `leaveTeam` để hỗ trợ citizen leader. 6) Viết lại unit test đầy đủ 46 cases - tất cả passed. |
| 2026-06-05 | **Add Team Specialization Module (standalone)**: Tách TeamSpecialization thành module riêng theo feature-based modular structure. Thêm @ManyToMany inverse side vào TeamSpecializationEntity. CRUD endpoints đầy đủ (GET list, GET by id, POST, PATCH, DELETE soft). Export ITeamSpecializationRepository để RescueTeamModule có thể inject. Cập nhật Postman collection. |
| 2026-05-28 | **Refactor Rescue Team sang Domain Entities**: Tách `RescueTeam`, `RescueTeamMember` thành domain entities trong `modules/rescue-team/domain/entities/`, cập nhật `IRescueTeamService` interface dùng domain types thay vì `RescueTeamEntity`, resolve TypeScript type conflicts. |
| 2026-05-28 | **Auth Contracts & Shared Base Repository**: Thêm `auth.contracts.ts` (BaseResponse, AuthLoginResponse, RegisterInput, AdminRegisterInput, toAuthUserResponse), thêm `shared/domain/repositories/base.repository.interface.ts` và `shared/infrastructure/persistence/base.repository.ts`. |
| 2026-05-27 | **Refactor to Feature-Based Modular Architecture**: Xóa duplicate domain entities, chuyển User entity vào `modules/auth/domain/entities/`, thống nhất enums vào `shared/core/enums/`, xóa unused `infrastructure/database/repositories/`, sửa DatabaseModule dùng explicit entities array thay vì autoLoadEntities, đảm bảo app chạy và build pass. |
| 2026-05-22 | Implement **Rescue Team Module** hoàn chỉnh: `TeamSpecializationEntity`, `IRescueTeamRepository`, `IRescueTeamMemberRepository`, `ITeamSpecializationRepository` + implementations, `RescueTeamService` (11 endpoints), `RescueTeamController`, `TeamSpecializationController`, `RescueTeamModule`, seed 13 team specializations. Bỏ `code` field, đổi `specializations` → `specializationIds`. Unit test 15 cases — tất cả passed. |
| 2026-05-21 | Chạy lại seeder (xóa 34 admin cũ, tạo mới 36 admins), tạo file `user-role.json` seed data, phát hiện và giải thích lỗi PostgreSQL `user` là keyword reserved. |
| 2026-05-21 | Xây dựng RBAC Permission Guard (`PermissionGuard` + `@RequirePermissions()` decorator), `IPermissionRepository` interface + implementation, đăng ký `PermissionGuard` làm APP_GUARD thứ 2. Cập nhật `JwtStrategy` thêm roleId vào request.user. |
| 2026-05-21 | Tạo Permission Sync Script (`npm run sync:permissions`) — đồng bộ permissions + role-permission mappings từ config vào DB. |
| 2026-05-21 | Redesign Permission Constants: `PermModule` enum, `PermAction` enum, `HTTP_METHOD_ACTION` mapping, `ActionSet` const, `ROLE_PERMISSION_MATRIX`. |
| 2026-05-21 | Xây dựng Health Check endpoint (`GET /health`) dùng `@nestjs/terminus`. Kiểm tra DB (TypeORM ping), Memory Heap, Memory RSS. |
| 2026-05-20 | Thiết lập ESLint/Prettier/Husky, tạo `AuthModule` (Login + JWT), encapsulated design Clean Architecture principles, implement fully Auth flow (Register, Refresh Token, Logout, Forgot/Reset Password), tạo bảng `refresh_token`. |
| 2026-05-20 | Cài `@nestjs-modules/mailer` + `handlebars`, tạo `MailModule` + `MailService`, thiết kế template email OTP HTML, tích hợp gửi email thật qua SMTP Gmail. |
| 2026-05-20 | Bổ sung endpoint `POST /auth/admin/register` cho Admin tạo tài khoản nhân viên. |

---

> **📌 Lưu ý:** File này được cập nhật vào **cuối mỗi buổi code** theo quy tắc trong `PROJECT_RULES.md`.
