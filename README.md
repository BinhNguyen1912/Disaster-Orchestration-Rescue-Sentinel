# Disaster Rescue Management System — Backend API

> Hệ thống quản lý cứu hộ thiên tai | NestJS + PostgreSQL + TypeORM

[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/nestjs-10.x-red.svg)](https://nestjs.com/)
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

## 🏗️ Kiến trúc

```
src/
├── domain/                    # Business logic
│   ├── entities/              # Domain entities
│   ├── enums/                 # Business enums
│   └── repositories/          # Repository interfaces
├── application/               # Application services
│   └── services/              # Business services
├── infrastructure/            # External concerns
│   ├── database/             # TypeORM entities & repositories
│   ├── auth/                  # JWT strategies, guards
│   ├── mail/                  # Email service
│   └── rescue-team/          # Module registration
└── presentation/             # API layer
    ├── controllers/           # REST controllers
    └── dtos/                  # Data transfer objects
```

**Clean Architecture layers:**

| Layer | Vai trò |
|-------|---------|
| **Domain** | Entities, Enums, Repository interfaces (không phụ thuộc gì) |
| **Application** | Services chứa business logic |
| **Infrastructure** | Database, Auth, Mail, External services |
| **Presentation** | Controllers, DTOs, Swagger |

---

## 🛠️ Công nghệ

| Category | Tech |
|----------|------|
| Framework | NestJS 10 |
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
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/register` | Đăng ký tài khoản công dân |
| POST | `/api/v1/auth/admin/register` | Admin tạo tài khoản nhân viên |
| POST | `/api/v1/auth/refresh` | Làm mới access token |
| POST | `/api/v1/auth/logout` | Đăng xuất |
| POST | `/api/v1/auth/forgot-password` | Yêu cầu OTP |
| POST | `/api/v1/auth/reset-password` | Đặt lại mật khẩu |

### Rescue Teams

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/team-specializations` | Danh sách chuyên môn đội |
| GET | `/api/v1/rescue-teams` | Danh sách đội cứu hộ (filter, search, phân trang) |
| POST | `/api/v1/rescue-teams` | Tạo đội cứu hộ |
| GET | `/api/v1/rescue-teams/:id` | Chi tiết đội |
| PATCH | `/api/v1/rescue-teams/:id` | Cập nhật đội |
| PATCH | `/api/v1/rescue-teams/:id/location` | Cập nhật vị trí GPS |
| DELETE | `/api/v1/rescue-teams/:id` | Xóa đội |
| POST | `/api/v1/rescue-teams/:id/members` | Thêm thành viên |
| GET | `/api/v1/rescue-teams/:id/members` | Danh sách thành viên |
| DELETE | `/api/v1/rescue-teams/:id/members/:memberId` | Xóa thành viên |
| PATCH | `/api/v1/rescue-teams/:id/members/:memberId/role` | Thay đổi vai trò |
| POST | `/api/v1/rescue-teams/leave` | Rời đội |

### Health

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/health` | Health check (DB + Memory) |

---

## 📊 Tiến độ

```
Phase 1: Infrastructure & Foundation    ████████████████████ 100% ✅
Phase 2: Auth & Core Modules            ████████████████████ 100% ✅
Phase 3: Business Modules
  ├── Rescue Team Module                ████████████████████ 100% ✅
  ├── SOS Module                        ░░░░░░░░░░░░░░░░░░░  0%
  ├── Flood Report                      ░░░░░░░░░░░░░░░░░░░  0%
  ├── Disaster Event                     ░░░░░░░░░░░░░░░░░░░  0%
  └── Casualty                           ░░░░░░░░░░░░░░░░░░░  0%
Phase 4: Extensions                     ░░░░░░░░░░░░░░░░░░░  0%
  ├── Donation Campaign                  ░░░░░░░░░░░░░░░░░░░  0%
  ├── Weather Alert                      ░░░░░░░░░░░░░░░░░░░  0%
  └── Message System                     ░░░░░░░░░░░░░░░░░░░  0%
```

**Stats:**
- 30+ Domain entities
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
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

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