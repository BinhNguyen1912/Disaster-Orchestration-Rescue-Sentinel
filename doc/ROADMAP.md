# ROADMAP — Backend Disaster Rescue System

> Cập nhật: 2026-05-04
> Trạng thái tổng: **Phase 1 — Đang bắt đầu**

---

## Tổng quan tiến độ

| Phase | Tên | Trạng thái | OpenSpec Change |
|-------|-----|-----------|-----------------|
| 1 | Hạ tầng & Foundation | 🔲 Chưa bắt đầu | — |
| 2 | Auth & Core Modules | 🔲 Chưa bắt đầu | — |
| 3 | Nghiệp vụ chính (SOS, Rescue, Disaster) | 🔲 Chưa bắt đầu | — |
| 4 | Mở rộng (Donation, Alert, Message) | 🔲 Chưa bắt đầu | — |

> **Ký hiệu:** 🔲 Chưa bắt đầu · 🟡 Đang làm · ✅ Hoàn thành · ⏸️ Tạm dừng

---

## Phase 1: Hạ tầng & Foundation

> **Mục tiêu:** Setup môi trường dev, cài dependencies, tạo cấu trúc thư mục, kết nối DB.

| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 1.1 | Docker Compose (PostgreSQL+PostGIS, Redis) | 🔲 | |
| 1.2 | Cài dependencies (TypeORM, pg, PostGIS driver, class-validator, passport-jwt, bcrypt, dotenv) | 🔲 | |
| 1.3 | Tạo cấu trúc thư mục modular (`src/modules/`, `src/shared/`) | 🔲 | |
| 1.4 | Config module (env validation, DB connection, Redis connection) | 🔲 | |
| 1.5 | Base entity (id, created_at, updated_at, deleted_at) | 🔲 | |
| 1.6 | Shared enums (tất cả enum từ RULES) | 🔲 | |
| 1.7 | Health check endpoint | 🔲 | |
| 1.8 | Verify: `docker compose up` + `npm run start:dev` chạy OK | 🔲 | |

---

## Phase 2: Auth & Core Modules

> **Mục tiêu:** User, JWT Auth, RBAC Guards, Province module, Seed data.

| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 2.1 | Module Province: entity + migration (`provinces`, `administrative_units`) | 🔲 | |
| 2.2 | Module Auth — User entity + migration (`users`) | 🔲 | |
| 2.3 | Module Auth — Register/Login (JWT access + refresh token) | 🔲 | |
| 2.4 | RBAC Guards (`@Roles()` decorator, `RolesGuard`) | 🔲 | |
| 2.5 | Province Scope Guard (auto-inject `province_id` từ JWT) | 🔲 | |
| 2.6 | Seed data: 63 tỉnh/thành + 1 SUPER_ADMIN + 1 PROVINCE_ADMIN demo | 🔲 | |
| 2.7 | Household Profile entity + migration | 🔲 | |
| 2.8 | Verify: Login → JWT → call protected endpoint → đúng role + đúng tỉnh | 🔲 | |

---

## Phase 3: Nghiệp vụ chính

> **Mục tiêu:** SOS, Rescue Team, Dispatch, Flood Reports, Casualties, Disaster Events.

| # | Task | Trạng thái | Ghi chú |
|---|------|-----------|---------|
| 3.1 | Module Rescue — `rescue_teams` + `rescue_team_members` entity + migration | 🔲 | |
| 3.2 | Module Rescue — CRUD đội cứu hộ + quản lý thành viên | 🔲 | |
| 3.3 | Module SOS — `sos_requests` entity + migration | 🔲 | |
| 3.4 | Module SOS — Gửi SOS (App/Web/IoT source) | 🔲 | |
| 3.5 | Module SOS — Auto-Dispatch thuật toán (PostGIS + scoring) | 🔲 | |
| 3.6 | Module SOS — Manual Dispatch | 🔲 | |
| 3.7 | Module SOS — WebSocket real-time SOS broadcast | 🔲 | |
| 3.8 | Module Disaster — `flood_reports` entity + CRUD | 🔲 | |
| 3.9 | Module Disaster — `casualties` entity + CRUD | 🔲 | |
| 3.10 | Module Disaster — `disaster_events` entity + aggregate stats | 🔲 | |
| 3.11 | Module Disaster — Community alert (≥3 reports → auto alert) | 🔲 | |
| 3.12 | Verify: Full flow SOS → Dispatch → Resolve | 🔲 | |

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
| 4.6 | GIS Layers — `flood_zones` + `infrastructure_layers` | 🔲 | |
| 4.7 | Module Rescue — `duty_logs` + `team_achievements` | 🔲 | |
| 4.8 | Verify: Full system integration test | 🔲 | |

---

## Lịch sử thay đổi

| Ngày | Thay đổi |
|------|----------|
| 2026-05-04 | Khởi tạo roadmap, tạo RULES_VI.md + RULES_EN.md, setup OpenSpec |

---

## OpenSpec Changes Log

> Mỗi khi dùng `/opsx:propose` → `/opsx:apply` → `/opsx:archive`, ghi lại ở đây.

| # | Change Name | Phase | Trạng thái | Ngày tạo | Ngày archive |
|---|------------|-------|-----------|----------|-------------|
| — | _(chưa có)_ | — | — | — | — |
