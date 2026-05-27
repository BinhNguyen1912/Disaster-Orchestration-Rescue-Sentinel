# 📊 Báo cáo Tiến độ Dự án — Disaster Rescue Management System (Backend)

> **Lần cập nhật gần nhất:** 2026-05-27
> **Người cập nhật:** AI Assistant (cập nhật cuối mỗi buổi code)
> **Trạng thái tổng:** 🟡 **Phase 3 — Rescue Team hoàn thành**

---

## 🗂️ Tổng quan Phases

| Phase | Tên | Tiến độ | Trạng thái |
|-------|-----|---------|-----------|
| 1 | Hạ tầng & Foundation | ██████████ 100% | ✅ Hoàn thành |
| 2 | Auth & Core Modules | ██████████ 100% | ✅ Hoàn thành |
| 3 | Nghiệp vụ chính (SOS, Rescue, Disaster) | ███░░░░░░░ 25% | 🟡 Đang làm |
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
| `SosRequestEntity` | `sos_request` | ✅ Entity có, chưa có logic |
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
- ✅ `JwtAuthGuard` — bảo vệ các endpoint yêu cầu đăng nhập
- ✅ `LocalAuthGuard` — bảo vệ endpoint `/auth/login`
- ✅ `AccessGuard` & `@Public()` — custom guard toàn cục
- ✅ `@CurrentUser()` — decorator lấy thông tin user/payload đã xác thực trong controller.
- ✅ **JWT Payload** chứa: `sub` (userId), `provinceId`, `roleId`, `email`
- ✅ `getActiveRoleId(provinceId?)` — hàm nghiệp vụ trong Domain Entity `User`, tự động lấy đúng roleId theo tỉnh thành
- ✅ **Multi-tenant**: Một user có thể giữ nhiều vai trò ở nhiều tỉnh khác nhau (bảng `user_role` làm cầu nối)
- ✅ **Permission Guard** (`@RequirePermissions()` decorator)
- ✅ **Province Scope** (explicit trong Service)
- ✅ **Permission Sync Script** (`npm run sync:permissions`)

---

## 🟢 Phase 3: Nghiệp vụ chính (Đang làm)

### ✅ Rescue Team Module — Hoàn thành 2026-05-22

- ✅ `TeamSpecializationEntity` + `ITeamSpecializationRepository`
- ✅ `RescueTeamRepository` + `RescueTeamMemberRepository`
- ✅ `RescueTeamService` (11 endpoints, business logic đầy đủ)
- ✅ `RescueTeamController` + `TeamSpecializationController`
- ✅ `RescueTeamModule` đăng ký vào `AppModule`
- ✅ `TeamSpecialization` seed data (13 specs)
- ✅ Unit test 15 cases — tất cả passed

### 🔲 Các module khác

- [ ] Module SOS (gửi SOS, auto-dispatch theo PostGIS, realtime WebSocket)
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
│   ├── common/constants/              # Messages, permissions
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
│   ├── auth/                         # AUTH MICROSERVICE
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
│   ├── rescue-team/                   # RESCUE TEAM MICROSERVICE
│   │   ├── domain/repositories/      # Repository interfaces
│   │   ├── application/services/     # Business logic
│   │   ├── infrastructure/persistence/repositories/
│   │   └── presentation/
│   │
│   ├── health/
│   └── mail/
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
|------|--------------------|
| 2026-05-27 | **Refactor to Feature-Based Modular Architecture**: Xóa duplicate domain entities, chuyển User entity vào `modules/auth/domain/entities/`, thống nhất enums vào `shared/core/enums/`, xóa unused `infrastructure/database/repositories/`, sửa DatabaseModule dùng explicit entities array thay vì autoLoadEntities, đảm bảo app chạy và build pass. |
| 2026-05-22 | Implement **Rescue Team Module** hoàn chỉnh: `TeamSpecializationEntity`, `IRescueTeamRepository`, `IRescueTeamMemberRepository`, `ITeamSpecializationRepository` + implementations, `RescueTeamService` (11 endpoints), `RescueTeamController`, `TeamSpecializationController`, `RescueTeamModule`, seed 13 team specializations. Bỏ `code` field, đổi `specializations` → `specializationIds`. Unit test 15 cases — tất cả passed. |
| 2026-05-21 | Chạy lại seeder (xóa 34 admin cũ, tạo mới 36 admins), tạo file `user-role.json` seed data, phát hiện và giải thích lỗi PostgreSQL `user` là keyword reserved. |
| 2026-05-21 | Xây dựng RBAC Permission Guard (`PermissionGuard` + `@RequirePermissions()` decorator), `IPermissionRepository` interface + implementation, đăng ký `PermissionGuard` làm APP_GUARD thứ 2. Cập nhật `JwtStrategy` thêm roleId vào request.user. |
| 2026-05-21 | Tạo Permission Sync Script (`npm run sync:permissions`) — đồng bộ permissions + role-permission mappings từ config vào DB. |
| 2026-05-21 | Redesign Permission Constants: `PermModule` enum, `PermAction` enum, `HTTP_METHOD_ACTION` mapping, `ActionSet` const, `ROLE_PERMISSION_MATRIX`. |
| 2026-05-21 | Xây dựng Health Check endpoint (`GET /health`) dùng `@nestjs/terminus`. Kiểm tra DB (TypeORM ping), Memory Heap, Memory RSS. |
| 2026-05-20 | Thiết lập ESLint/Prettier/Husky, tạo `AuthModule` (Login + JWT), thiết kế kiến trúc Clean Architecture, implement đầy đủ Auth flow (Register, Refresh Token, Logout, Forgot/Reset Password), tạo bảng `refresh_token`. |
| 2026-05-20 | Cài `@nestjs-modules/mailer` + `handlebars`, tạo `MailModule` + `MailService`, thiết kế template email OTP HTML, tích hợp gửi email thật qua SMTP Gmail. |
| 2026-05-20 | Bổ sung endpoint `POST /auth/admin/register` cho Admin tạo tài khoản nhân viên. |

---

> **📌 Lưu ý:** File này được cập nhật vào **cuối mỗi buổi code** theo quy tắc trong `PROJECT_RULES.md`.
