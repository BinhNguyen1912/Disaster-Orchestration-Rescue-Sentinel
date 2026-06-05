# ROADMAP — Backend Disaster Rescue System

> Cập nhật: 2026-06-05
> Trạng thái tổng: **Phase 3 — Rescue Team hoàn thành Flexible Member System**

---

## Tổng quan tiến độ

| Phase | Tên | Trạng thái | Ghi chú |
|-------|-----|-----------|-----------------|
| 1 | Hạ tầng & Foundation | ✅ Hoàn thành | Đã setup Docker, TypeORM, modular structure |
| 2 | Auth & Core Modules | ✅ Hoàn thành | Auth, Province, Role, Team Specialization |
| 3 | Nghiệp vụ chính (SOS, Rescue, Disaster) | 🟡 Đang làm | Rescue Team ✅ (flexible member + 46 unit tests) |
| 4 | Mở rộng (Donation, Alert, Message) | 🔲 Chưa bắt đầu | |

> **Ký hiệu:** 🔲 Chưa bắt đầu · 🟡 Đang làm · ✅ Hoàn thành · ⏸️ Tạm dừng

---

## Phase 1: Hạ tầng & Foundation ✅

> **Mục tiêu:** Setup môi trường dev, cài dependencies, tạo cấu trúc thư mục, kết nối DB.

| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 1.1 | Docker Compose (PostgreSQL+PostGIS, Redis) | ✅ | docker-compose.yml đã có |
| 1.2 | Cài dependencies (TypeORM, pg, PostGIS driver, class-validator, passport-jwt, bcrypt, dotenv) | ✅ | package.json đã setup đầy đủ |
| 1.3 | Tạo cấu trúc thư mục modular (`src/modules/`, `src/shared/`) | ✅ | Clean Architecture structure |
| 1.4 | Config module (env validation, DB connection, Redis connection) | ✅ | app.module.ts, database.module.ts |
| 1.5 | Base entity (id, created_at, updated_at, deleted_at) | ✅ | Có trong các entity files |
| 1.6 | Shared enums (tất cả enum từ RULES) | ✅ | src/shared/core/enums/ |
| 1.7 | Health check endpoint | ✅ | HealthController |
| 1.8 | Verify: `docker compose up` + `npm run start:dev` chạy OK | ✅ | Đã verify |

**Commit liên quan:** `ddaeadf` - refactor: restructure to feature-based modular architecture

---

## Phase 2: Auth & Core Modules 🟡

> **Mục tiêu:** User, JWT Auth, RBAC Guards, Province module, Seed data.

### 2.1 Province Module
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 2.1.1 | Province entity + migration (`provinces`, `administrative_units`) | ✅ | Có trong db seeds |
| 2.1.2 | Seed data 63 tỉnh/thành | ✅ | provinces.json |

### 2.2 Module Auth — User Management ✅
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 2.2.1 | Module Auth — User entity + migration (`users`) | ✅ | user.entity.ts |
| 2.2.2 | Module Auth — Register/Login (JWT access + refresh token) | ✅ | Complete |
| 2.2.3 | Module Auth — Refresh token rotation | ✅ | Complete |
| 2.2.4 | Module Auth — Logout (revoke refresh token) | ✅ | Complete |
| 2.2.5 | Module Auth — Forgot password + OTP | ✅ | Email OTP implemented |
| 2.2.6 | Module Auth — Reset password | ✅ | Complete |
| 2.2.7 | Module Auth — Admin registration | ✅ | With role assignment |

### 2.3 RBAC & Guards ✅
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 2.3.1 | RBAC Guards (`@Roles()` decorator, `RolesGuard`) | ✅ | @RequirePermissions |
| 2.3.2 | JWT Auth Guard | ✅ | JwtAuthGuard |
| 2.3.3 | Permission Guard | ✅ | PermissionGuard |
| 2.3.4 | Province Scope Guard (auto-inject `province_id` từ JWT) | ⏸️ | Chưa implement |
| 2.3.5 | Access Guard (API Key mode) | ✅ | Supporting none, api-key, jwt modes |

### 2.4 Seed Data ✅
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 2.4.1 | Seed SUPER_ADMIN + PROVINCE_ADMIN demo | ✅ | admin-users.json |
| 2.4.2 | Seed permissions | ✅ | permission-sync.config.ts |
| 2.4.3 | Seed user-role mappings | ✅ | user-role.json |

### 2.5 Household Profile
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 2.5.1 | Household Profile entity + migration | 🔲 | Chưa bắt đầu |

### 2.6 Verify
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 2.6.1 | Verify: Login → JWT → call protected endpoint → đúng role + đúng tỉnh | 🔲 | Chưa verify end-to-end |

**Commit liên quan:**
- `7b6be16` - feat(rescue-team): implement rescue team module with CRUD, member management
- `4ccc88b` - feat(auth): implement register, refresh-token, logout, forgot/reset password
- `2b98dae` - feat(auth): add admin registration functionality and email OTP for password reset

---

## Phase 3: Nghiệp vụ chính

> **Mục tiêu:** SOS, Rescue Team, Dispatch, Flood Reports, Casualties, Disaster Events.

### 3.1 Module Rescue Team ✅
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 3.1.1 | Module Rescue — `rescue_teams` + `rescue_team_members` entity + migration | ✅ | rescue-team.entity.ts, rescue-team-member.entity.ts |
| 3.1.2 | Module Rescue — CRUD đội cứu hộ + quản lý thành viên | ✅ | RescueTeamService + Controller |
| 3.1.3 | Module Rescue — Team Specializations | ✅ | TeamSpecializationService |
| 3.1.4 | Module Rescue — Flexible Member (citizen without account) | ✅ | 2026-06-05: userId nullable, citizenName/citizenPhone support |
| 3.1.5 | Module Rescue — Unit Tests (46 cases) | ✅ | 2026-06-05: All passing |

### 3.2 Module SOS
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 3.2.1 | Module SOS — `sos_requests` entity + migration | 🔲 | |
| 3.2.2 | Module SOS — Gửi SOS (App/Web/IoT source) | 🔲 | |
| 3.2.3 | Module SOS — Auto-Dispatch thuật toán (PostGIS + scoring) | 🔲 | |
| 3.2.4 | Module SOS — Manual Dispatch | 🔲 | |
| 3.2.5 | Module SOS — WebSocket real-time SOS broadcast | 🔲 | |

### 3.3 Module Disaster
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 3.3.1 | Module Disaster — `flood_reports` entity + CRUD | 🔲 | |
| 3.3.2 | Module Disaster — `casualties` entity + CRUD | 🔲 | |
| 3.3.3 | Module Disaster — `disaster_events` entity + aggregate stats | 🔲 | |
| 3.3.4 | Module Disaster — Community alert (≥3 reports → auto alert) | 🔲 | |
| 3.3.5 | Module Disaster — GIS Layers | 🔲 | flood_zones, infrastructure_layers |

### 3.4 Verify
| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 3.4.1 | Verify: Full flow SOS → Dispatch → Resolve | 🔲 | |

---

## Phase 4: Mở rộng

> **Mục tiêu:** Donation, Weather Alert, IoT, Messaging.

| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 4.1 | Module Donation — `donations` + `donation_campaigns` | 🔲 | |
| 4.2 | Module Alert — `weather_alerts` + External API cron jobs | 🔲 | |
| 4.3 | Module Alert — IoT devices (`iot_devices`) + MQTT integration | 🔲 | |
| 4.4 | Module Message — `messages` + `message_reads` + broadcast | 🔲 | |
| 4.5 | Module Shared — `audit_logs` | 🔲 | |
| 4.6 | Module Rescue — `duty_logs` + `team_achievements` | 🔲 | |
| 4.7 | Verify: Full system integration test | 🔲 | |

---

## Phụ lục: Clean Architecture Index

> Ghi chú các thay đổi architecture quan trọng

| Ngày | Thay đổi | Ghi chú |
|------|----------|---------|
| 2026-05-28 | Refactor auth + rescue-team modules theo Clean Architecture | Tách application/dtos, presentation/dtos validation |
| 2026-05-28 | Tạo docs/ARCHITECTURE.md | Giải thích chi tiết Clean Architecture |
| 2026-05-28 | Move base-response.dto sang shared/common/dtos | |

---

## Lịch sử thay đổi

| Ngày | Thay đổi |
|------|----------|
| 2026-06-05 | Rescue Team: Flexible Member System (userId nullable, citizen support), Unit Tests 46 cases, TeamSpecialization consolidate vào shared |
| 2026-05-28 | Update tiến độ: Phase 1 ✅, Phase 2 auth ✅, rescue-team ✅, Clean Architecture refactor |
| 2026-05-04 | Khởi tạo roadmap, tạo RULES_VI.md + RULES_EN.md, setup OpenSpec |

---

## OpenSpec Changes Log

> Mỗi khi dùng `/opsx:propose` → `/opsx:apply` → `/opsx:archive`, ghi lại ở đây.

| # | Change Name | Phase | Trạng thái | Ngày tạo | Ngày archive |
|---|------------|-------|-----------|----------|-------------|
| — | _(chưa có)_ | — | — | — | — |
