# Disaster Rescue Management System — Backend API

> Hệ thống quản lý cứu hộ thiên tai | NestJS + PostgreSQL + TypeORM

[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/nestjs-11.x-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15+-blue.svg)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/postgis-3.x-green.svg)](https://postgis.net/)

---

## 📌 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng](#-tính-năng)
- [Kiến trúc](#-kiến-trúc)
- [Công nghệ](#-công-nghệ)
- [API Endpoints](#-api-endpoints)
- [Tiến độ](#-tiến-độ)
- [Setup](#-setup)

---

## 🎯 Giới thiệu

**Disaster Rescue Management System (DORS)** là backend API cho hệ thống quản lý cứu hộ thiên tai tại Việt Nam.

Hệ thống hỗ trợ:
- Quản lý đội cứu hộ và nhân viên cứu hộ
- Tiếp nhận và xử lý tín hiệu SOS
- Báo cáo và theo dõi lũ lụt
- Quản lý sự kiện thiên tai
- Cảnh báo thời tiết và IoT
- Quyên góp và chiến dịch cứu trợ

---

## ⚡ Tính năng

### Đã hoàn thành

| Tính năng | Mô tả |
|-----------|-------|
| **Authentication** | JWT Access Token + Refresh Token, đăng nhập email/SĐT, OTP email, RBAC phân quyền |
| **Rescue Teams** | CRUD đội cứu hộ, quản lý thành viên (thêm/xóa/promote), phân loại chuyên môn |
| **Permissions** | Permission Guard với 80+ permissions, role-permission matrix, sync script |
| **Health Check** | Kiểm tra DB, memory heap, memory RSS |
| **API Documentation** | Swagger UI tại `/api/docs` |

### Đang phát triển

| Module | Trạng thái |
|--------|-----------|
| SOS Request | 🔄 |
| Flood Report | 🔄 |
| Disaster Event | 🔄 |
| Donation Campaign | 📋 |
| Weather Alert | 📋 |
| Message System | 📋 |

---

## 🏗️ Kiến trúc (Feature-Based Modular)

```
src/
├── shared/                             ← SHARED kernel (cross-module)
│   ├── common/constants/                # Messages, permissions
│   ├── common/middlewares/              # Logger middleware
│   └── core/enums/                      # 31 business enums
│
├── infrastructure/database/             ← SHARED infrastructure
│   ├── database.module.ts              # @Global() TypeORM config
│   ├── entities/                        # 28 TypeORM entities
│   │   └── index.ts                    # Barrel export
│   └── seeds/                           # DB seeding
│
├── modules/                             # FEATURE MODULES (microservices-ready)
│   ├── auth/                            # Authentication & Authorization
│   │   ├── domain/
│   │   │   ├── entities/User.ts         # Pure domain class (has business logic)
│   │   │   ├── interfaces/
│   │   │   └── repositories/          # Repository interfaces
│   │   ├── application/services/       # AuthService, AccessService
│   │   ├── infrastructure/
│   │   │   ├── auth/                   # Guards, strategies, decorators
│   │   │   └── persistence/repositories/ # TypeORM implementations
│   │   └── presentation/
│   │       ├── controllers/
│   │       └── dtos/
│   │
│   ├── rescue-team/                     # Rescue Team Management
│   │   ├── domain/repositories/       # Repository interfaces
│   │   ├── application/services/       # Business logic
│   │   ├── infrastructure/persistence/repositories/
│   │   └── presentation/
│   │
│   ├── health/                          # Health check
│   └── mail/                            # Email service
│
└── app.module.ts                        # Root module
```

**Clean Architecture principles:**

| Layer | Vai trò | Ví dụ |
|-------|--------|-------|
| **Domain** | Pure business entities + interfaces | `User`, `IUserRepository` |
| **Application** | Business logic, use cases | `AuthService`, `RescueTeamService` |
| **Infrastructure** | External implementations | TypeORM repos, Mail service |
| **Presentation** | API contracts | Controllers, DTOs, Swagger |

**Microservices readiness:**
- Each feature module in `modules/` is self-contained
- Can be extracted to a separate microservice with its own database
- Shared kernel (`shared/`, `infrastructure/database/`) is copied to each service

---

## 🛠️ Công nghệ

| Category | Tech |
|----------|------|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 15 + PostGIS 3 |
| ORM | TypeORM |
| Authentication | JWT + Refresh Token (rotate) |
| Validation | class-validator + class-transformer |
| Documentation | Swagger (OpenAPI 3.0) |
| Email | @nestjs-modules/mailer + Handlebars |
| Testing | Jest |
| Linting | ESLint + Prettier + Husky |

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/login` | Đăng nhập |
| POST | `/auth/register` | Đăng ký tài khoản công dân |
| POST | `/auth/admin/register` | Admin tạo tài khoản nhân viên |
| POST | `/auth/refresh` | Làm mới access token |
| POST | `/auth/logout` | Đăng xuất |
| POST | `/auth/forgot-password` | Yêu cầu OTP |
| POST | `/auth/reset-password` | Đặt lại mật khẩu |

### Rescue Teams

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/team-specializations` | Danh sách chuyên môn đội |
| GET | `/rescue-teams` | Danh sách đội cứu hộ (filter, search, phân trang) |
| POST | `/rescue-teams` | Tạo đội cứu hộ |
| GET | `/rescue-teams/:teamId` | Chi tiết đội |
| PATCH | `/rescue-teams/:teamId` | Cập nhật đội |
| PATCH | `/rescue-teams/:teamId/location` | Cập nhật vị trí GPS |
| DELETE | `/rescue-teams/:teamId` | Xóa đội |
| POST | `/rescue-teams/:teamId/members` | Thêm thành viên |
| GET | `/rescue-teams/:teamId/members` | Danh sách thành viên |
| DELETE | `/rescue-teams/:teamId/members/:memberId` | Xóa thành viên |
| PATCH | `/rescue-teams/:teamId/members/:memberId/role` | Thay đổi vai trò |
| POST | `/rescue-teams/leave` | Rời đội |

### Health

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Health check (DB + Memory) |

---

## 📊 Tiến độ

```
Phase 1: Infrastructure & Foundation    ████████████████████ 100% ✅
Phase 2: Auth & Core Modules            ████████████████████ 100% ✅
Phase 3: Business Modules
  ├── Rescue Team Module                ████████████████████ 100% ✅
  ├── SOS Module                         ░░░░░░░░░░░░░░░░░░░  0%
  ├── Flood Report                      ░░░░░░░░░░░░░░░░░░░  0%
  ├── Disaster Event                    ░░░░░░░░░░░░░░░░░░░  0%
  └── Casualty                          ░░░░░░░░░░░░░░░░░░░  0%
Phase 4: Extensions                     ░░░░░░░░░░░░░░░░░░░  0%
  ├── Donation Campaign                  ░░░░░░░░░░░░░░░░░░░  0%
  ├── Weather Alert                     ░░░░░░░░░░░░░░░░░░░  0%
  └── Message System                    ░░░░░░░░░░░░░░░░░░░  0%
```

**Stats:**
- 28 TypeORM entities
- 31 business enums
- 80+ Permissions configured
- 15 Unit tests (RescueTeamService)
- 63 Tỉnh/Thành seed data

---

## 🚀 Setup

```bash
# Clone & install
npm install

# Setup database (PostgreSQL + PostGIS via Docker)
docker-compose up -d

# Run migrations & seed
npm run seed

# Start development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production
npm run start:prod
```

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=dors

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# Mail (SMTP Gmail)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM_NAME=RescueSystem
```

---

## 🔐 Security

- JWT Access Token (15 phút) + Refresh Token (7 ngày, rotate)
- Mật khẩu mã hóa bcrypt (salt rounds = 10)
- OTP 6 số, hết hạn 5 phút
- Permission-based access control (RBAC)
- Rotate refresh token on every use

---

## 📄 License

MIT
