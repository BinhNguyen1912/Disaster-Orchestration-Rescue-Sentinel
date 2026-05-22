# 📊 Báo cáo Tiến độ Dự án — Disaster Rescue Management System (Backend)

> **Lần cập nhật gần nhất:** 2026-05-22
> **Người cập nhật:** AI Assistant (cập nhật cuối mỗi buổi code)
> **Trạng thái tổng:** 🟡 **Phase 2 ✅ & Phase 3 — Đã bắt đầu**

---

## 🗂️ Tổng quan Phases

| Phase | Tên | Tiến độ | Trạng thái |
|-------|-----|---------|-----------|
| 1 | Hạ tầng & Foundation | ██████████ 100% | ✅ Hoàn thành |
| 2 | Auth & Core Modules | ██████████ 100% | ✅ Hoàn thành |
| 3 | Nghiệp vụ chính (SOS, Rescue, Disaster) | ██░░░░░░░░ 15% | 🟡 Đang làm |
| 4 | Mở rộng (Donation, Alert, IoT, Message) | ░░░░░░░░░░ 0% | 🔲 Chưa bắt đầu |

---

## ✅ Phase 1: Hạ tầng & Foundation

| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 1.1 | Docker Compose (PostgreSQL + PostGIS) | ✅ Hoàn thành | `docker-compose.yml` đã có |
| 1.2 | Cài dependencies (NestJS, TypeORM, pg, passport-jwt, bcrypt, class-validator...) | ✅ Hoàn thành | `package.json` đầy đủ |
| 1.3 | Cấu trúc thư mục Clean Architecture (domain/application/infrastructure/presentation) | ✅ Hoàn thành | 4 layer tách biệt rõ ràng |
| 1.4 | Config module (env validation, DB connection) | ✅ Hoàn thành | `ConfigModule.forRoot()` global |
| 1.5 | Base Repository (CRUD chung cho tất cả) | ✅ Hoàn thành | `base.repository.ts` + `base.repository.interface.ts` |
| 1.6 | Shared Enums (Gender...) | ✅ Hoàn thành | Tất cả enums đã có trong `domain/enums/` |
| 1.7 | Health check endpoint | ✅ Hoàn thành | `@nestjs/terminus`, `GET /health` — DB + Memory check |
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
| `RefreshTokenEntity` | `refresh_token` | ✅ Hoàn thành *(mới — buổi hôm nay)* |
| `PermissionEntity` | `permission` | ✅ Hoàn thành — PermissionGuard + Sync Script |
| `RolePermissionEntity` | `role_permission` | ✅ Hoàn thành — PermissionGuard + Sync Script |
| `DeviceEntity` | `device` | ✅ Entity có, chưa có logic |
| `AuditLogEntity` | `audit_log` | ✅ Entity có, chưa có logic |
| `HouseholdProfileEntity` | `household_profile` | ✅ Entity có, chưa có logic |
| `RescueTeamEntity` | `rescue_team` | ✅ Entity có, chưa có logic |
| `RescueTeamMemberEntity` | `rescue_team_member` | ✅ Entity có, chưa có logic |
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

Đây là module đã hoàn thiện nhất trong hệ thống. Các DTOs đã được tạo trong `src/presentation/dtos/auth/`:
- `LoginDto` — đăng nhập
- `RegisterDto` — đăng ký người dân
- `AdminRegisterDto` — Admin tạo tài khoản nhân viên *(mới)*
- `ForgotPasswordDto` / `ResetPasswordDto` — quên/khôi phục mật khẩu
- `RefreshTokenRequestDto` — refresh token
- `UserResponseDto` — trả về thông tin user

| Tính năng | Endpoint | Trạng thái |
|-----------|----------|-----------|
| Đăng nhập | `POST /auth/login` | ✅ Hoàn thành |
| Đăng ký tài khoản | `POST /auth/register` | ✅ Hoàn thành |
| Tạo tài khoản nhân viên (Admin) | `POST /auth/admin/register` | ✅ Hoàn thành *(mới — 2026-05-20)* |
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
- ✅ Email template HTML đẹp với Handlebars (từng ô chữ số OTP riêng biệt)
- ✅ Đăng xuất/Reset mật khẩu tự động revoke toàn bộ phiên
- ✅ LocalStrategy (Passport) xác thực bằng SĐT hoặc Email

### 2.2.1 Bảo mật flow Quên mật khẩu (OTP + resetToken)

```
User gửi request → Server tạo OTP (6 số, 5 phút) + resetToken (UUID) → Lưu DB → Gửi email cho user
                                        ↓
                        User gửi: resetToken + OTP + newPassword
                                        ↓
                          Server verify 3 điều kiện → Update password → Xóa OTP/resetToken
```

**Tại sao cần 2 yếu tố (OTP + resetToken)?**

| Yếu tố | Mục đích |
|--------|----------|
| `resetToken` | Là "key" — user truyền trong request reset password, không gửi qua email |
| `OTP` | Là "password" — gửi qua email/SMS, attacker không biết nếu không có quyền truy cập hòm thư |

**Cách tấn công bị chặn:**
1. Attacker gửi `POST /auth/forgot-password` với email nạn nhân
2. Server gửi OTP cho nạn nhân (không phải attacker)
3. Attacker không có OTP → không reset được
4. Attacker không có resetToken (về client) → không reset được
5. Attacker cần kiểm soát **cả email lẫn resetToken** mới hack được

**resetToken là gì?**
- UUID v4 ngẫu nhiên (~122 bit entropy, không đoán được)
- Không liên quan OTP (không thể suy ra từ OTP)
- Dùng 1 lần — sau reset thành công, cả OTP và resetToken đều bị xóa khỏi DB

**Điểm yếu tiềm năng (đã mitigate):**
- OTP brute-force? → Hết hạn sau 5 phút, không đủ thời gian
- Attacker vào email victim? → Cần resetToken (về client) + OTP → vẫn cần 2 yếu tố
- Email bị forward/screenshot? → resetToken không gửi qua email, chỉ có OTP

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
- ✅ `AccessGuard` & `@Public()` — custom guard toàn cục, bảo vệ toàn hệ thống với 3 chế độ: none (public), api-key, và access (JWT).
- ✅ `@CurrentUser()` — decorator lấy thông tin user/payload đã xác thực trong controller.
- ✅ **JWT Payload** chứa: `sub` (userId), `provinceId`, `roleId`, `email`
- ✅ `getActiveRoleId(provinceId?)` — hàm nghiệp vụ trong Domain Entity `User`, tự động lấy đúng roleId theo tỉnh thành
- ✅ **Multi-tenant**: Một user có thể giữ nhiều vai trò ở nhiều tỉnh khác nhau (bảng `user_role` làm cầu nối)
- ✅ **Permission Guard** (`@RequirePermissions()` decorator) — Hoàn thành (2026-05-21)
- ✅ **Province Scope** (explicit trong Service) — Hoàn thành (2026-05-21)
- ✅ **Permission Sync Script** (`npm run sync:permissions`) — Hoàn thành (2026-05-21)
- ✅ **Permission Constants** (`PermModule`, `PermAction`, `ActionSet`, `Permissions`) — Hoàn thành (2026-05-21)
- ✅ **ROLE_PERMISSION_MATRIX** — Khai báo matrix gọn, auto-generate permissions — Hoàn thành (2026-05-21)

### 2.4 Kiến trúc Clean Architecture

| Tầng | Nội dung | Trạng thái |
|------|---------|-----------|
| **Domain Layer** | 27 Domain Entities + 4 Repository Interfaces (thêm IPermissionRepository) | ✅ |
| **Application Layer** | `AuthService`, `AccessService` | 🟡 |
| **Infrastructure Layer** | TypeORM Entities, 4 Repository Impls, Strategies, Guards (AccessGuard, PermissionGuard) | ✅ |
| **Presentation Layer** | `AuthController`, `HealthController`, DTOs, Swagger | 🟡 (chỉ mới có Auth + Health) |

---

## 🔲 Phase 3: Nghiệp vụ chính (Đang làm)

- [x] Module Rescue Team (đội cứu hộ, thành viên, nhiệm vụ) — **Hoàn thành 2026-05-22**
  - ✅ `TeamSpecializationEntity` + `ITeamSpecializationRepository`
  - ✅ `RescueTeamRepository` + `RescueTeamMemberRepository`
  - ✅ `RescueTeamService` (11 endpoints, business logic đầy đủ)
  - ✅ `RescueTeamController` + `TeamSpecializationController`
  - ✅ `RescueTeamModule` đăng ký vào `AppModule`
  - ✅ `TeamSpecialization` seed data (13 specs: PCCC, Y_TE, DAN_PHONG, QUAN_SU, TINH_NGUYEN, TONG_HOP)
  - ✅ Bỏ `code` field khỏi RescueTeam (thừa), đổi `specializations: string[]` → `specializationIds: number[]`
  - ✅ Unit test 15 cases — tất cả passed
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

## 📋 Các vấn đề kỹ thuật còn tồn đọng (Technical Debt)

| # | Vấn đề | Mức độ | Ghi chú |
|---|--------|--------|---------|
| 1 | OTP chỉ log ra console khi user dùng SĐT (chưa có SMS) | 🟡 Trung bình | Cần tích hợp Twilio / ESMS |
| 2 | `synchronize: true` trong TypeORM (chỉ dùng dev) | 🔴 Cao | Phải chuyển sang migration trước khi production |
| 3 | Permission Guard chưa implement | ✅ Đã hoàn thành | `PermissionGuard` + `@RequirePermissions()` + Sync Script |
| 4 | Province Scope chưa implement | ✅ Đã hoàn thành | Explicit trong Service, không dùng Interceptor |
| 5 | Chưa có unit test | ✅ Đã hoàn thành | RescueTeamService: 15 unit tests passed |
| 6 | Health check endpoint chưa có | ✅ Đã hoàn thành | `@nestjs/terminus`, `GET /health` — DB + Memory |
| 7 | Fix bug `BaseRepository.update()` — lọc undefined values trước khi merge vào entity để tránh ghi đè thành null | ✅ Đã fix | Bug gây lỗi `null value in column "provinceId"` khi update OTP fields |
| 8 | Admin users seed thiếu `user_role` mapping → JWT không có roleId | ✅ Đã fix | Đã re-seed, tạo đủ user_role cho 36 admins |
| 9 | Permission check query DB mỗi request (chưa có Redis cache) | 🟡 Trung bình | Thêm Redis cache layer khi traffic tăng |

---

## 📅 Lịch sử buổi code

| Ngày | Nội dung công việc |
|------|--------------------|
| 2026-05-20 | Thiết lập ESLint/Prettier/Husky, tạo `AuthModule` (Login + JWT), thiết kế kiến trúc Clean Architecture, implement đầy đủ Auth flow (Register, Refresh Token, Logout, Forgot/Reset Password), tạo bảng `refresh_token`, viết `UserResponseDto.fromEntity()` |
| 2026-05-20 | Cài `@nestjs-modules/mailer` + `handlebars`, tạo `MailModule` + `MailService`, thiết kế template email OTP HTML đẹp, tích hợp gửi email thật qua SMTP Gmail khi quên mật khẩu, cập nhật `nest-cli.json` để copy `.hbs` sang `dist` |
| 2026-05-20 | Fix lỗi `HandlebarsAdapter` import, bổ sung endpoint `POST /auth/admin/register` cho Admin tạo tài khoản nhân viên (Admin tỉnh, Quản lý cứu hộ, Cứu hộ viên...) với roleId chỉ định, thêm `assignRole()` method trong `IUserRepository` |
| 2026-05-20 | Ghi chú bảo mật flow Forgot Password (OTP + resetToken 2-yếu-tố), fix bug `BaseRepository.update()` ghi đè undefined thành null gây lỗi `provinceId` |
| 2026-05-20 | Tạo dashboard web `progress.html` để xem tiến độ bằng trình duyệt thay vì Markdown, bổ sung rules #6/#7 vào `PROJECT_RULES.md` về auto-save khi kết thúc buổi code |
| 2026-05-21 | Xây dựng Unified Access Guard (none, api-key, access), AccessService, `@Public` và `@CurrentUser` decorator. Áp dụng bảo vệ toàn cục ứng dụng (APP_GUARD), bổ sung cấu hình API_KEY và cấu hình các route public. |
| 2026-05-21 | Xây dựng RBAC Permission Guard (`PermissionGuard` + `@RequirePermissions()` decorator), `IPermissionRepository` interface + implementation, đăng ký `PermissionGuard` làm APP_GUARD thứ 2. Cập nhật `JwtStrategy` thêm roleId vào request.user. |
| 2026-05-21 | Tạo Permission Sync Script (`npm run sync:permissions`) — đồng bộ permissions + role-permission mappings từ config vào DB. Idempotent, upsert, không auto-delete. |
| 2026-05-21 | Redesign Permission Constants: `PermModule` enum, `PermAction` enum, `HTTP_METHOD_ACTION` mapping, `ActionSet` const, `ROLE_PERMISSION_MATRIX` (khai báo matrix gọn). `Permissions` object auto-generate từ matrix. `PermissionString` type cho type-safe decorator. |
| 2026-05-21 | Xây dựng Health Check endpoint (`GET /health`) dùng `@nestjs/terminus`. Kiểm tra kết nối DB (TypeORM ping), Memory Heap (< 300MB), Memory RSS (< 500MB). Public endpoint, trả 200 nếu OK, 503 nếu fail. |
| 2026-05-21 | Chạy lại seeder (xóa 34 admin cũ, tạo mới 36 admins), tạo file `user-role.json` seed data, phát hiện và giải thích lỗi PostgreSQL `user` là keyword reserved. |
| 2026-05-22 | Implement **Rescue Team Module** hoàn chỉnh: `TeamSpecializationEntity`, `IRescueTeamRepository`, `IRescueTeamMemberRepository`, `ITeamSpecializationRepository` + implementations, `RescueTeamService` (11 endpoints), `RescueTeamController`, `TeamSpecializationController`, `RescueTeamModule`, seed 13 team specializations. Bỏ `code` field khỏi RescueTeam, đổi `specializations` → `specializationIds`. Unit test 15 cases — tất cả passed. |

---

> **📌 Lưu ý:** File này được cập nhật vào **cuối mỗi buổi code** theo quy tắc trong `PROJECT_RULES.md`.
