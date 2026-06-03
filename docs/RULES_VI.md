# RULES — Hệ thống Cứu hộ Thiên tai (Backend)

> **Mục đích:** Cung cấp context tối thiểu & đủ để AI code chính xác. KHÔNG đọc PROJECT_RULES.md trừ khi cần tra cứu nghiệp vụ chi tiết.

---

## 1. DỰ ÁN

- **Tên:** Hệ thống Quản lý & Điều phối Cứu hộ Thiên tai
- **Loại:** Multi-tenant SaaS theo Tỉnh (63 tỉnh/thành VN)
- **Gồm 3 sản phẩm:** Web Admin (Next.js) · Mobile (React Native + Expo) · IoT (ESP32)
- **Repo này:** Backend API

---

## 2. TECH STACK (Backend)

| Tầng | Công nghệ | Ghi chú |
|------|-----------|---------|
| Framework | NestJS 11 + TypeScript | Clean Architecture |
| DB | PostgreSQL 15 + PostGIS 3 | Multi-tenant bằng `province_id` |
| ORM | TypeORM | Migration-based, không sync |
| Cache/Queue | Redis + BullMQ | |
| Real-time | Socket.io | WebSocket gateway |
| IoT | Mosquitto MQTT | |
| Auth | JWT + RBAC | 7 roles, province-scoped |
| Storage | Cloudflare R2 | S3-compatible |
| Module | `nodenext` | tsconfig: module & moduleResolution |
| Formatter | Prettier | singleQuote, trailingComma: all |
| Linter | ESLint flat config | typescript-eslint + prettier |

---

## 3. KIẾN TRÚC — Clean Architecture

```
src/
├── modules/
│   ├── disaster/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── rescue/
│   ├── iot-sensor/
│   ├── alert/
│   └── province/
└── shared/
    ├── auth/
    └── infrastructure/
```

### Quy tắc kiến trúc BẮT BUỘC:

1. **Dependency Rule:** `domain ← application ← infrastructure / presentation`. Domain KHÔNG import bất kỳ layer nào khác.
2. **Controller phải mỏng:** Chỉ validate input → gọi use-case → trả response. KHÔNG có logic nghiệp vụ.
3. **1 Use-case = 1 file = 1 class** với method `execute()`.
4. **Repository Pattern:** Domain định nghĩa interface, Infrastructure implement.
5. **Guard `ProvinceScope`** trên MỌI controller — tự inject `province_id` từ JWT.

---

## 4. QUY ƯỚC CODE

### 4.1 Naming

| Thứ | Convention | Ví dụ |
|-----|-----------|-------|
| File | kebab-case | `create-sos-request.use-case.ts` |
| Class | PascalCase | `CreateSosRequestUseCase` |
| Interface | Prefix `I` | `ISosRequestRepository` |
| DTO | Suffix `Dto` | `CreateSosRequestDto` |
| Entity (domain) | PascalCase, không suffix | `SosRequest` |
| Entity (TypeORM) | Suffix `Entity` | `SosRequestEntity` |
| Enum | UPPER_SNAKE | `SosStatus.IN_PROGRESS` |
| DB column | snake_case | `province_id`, `created_at` |
| Method | camelCase | `findByProvinceId()` |

### 4.2 File Structure cho 1 Module

```
src/
├── domain/entities/sos-request.ts
├── domain/repositories/sos-request.repository.interface.ts
├── application/use-cases/sos/
│   ├── create-sos-request.use-case.ts
│   ├── assign-sos-request.use-case.ts
│   └── index.ts
├── application/dtos/sos/
│   ├── create-sos-request.dto.ts
│   └── sos-request-response.dto.ts
├── infrastructure/database/entities/sos-request.entity.ts
├── infrastructure/database/repositories/sos-request.repository.ts
├── presentation/controllers/sos-request.controller.ts
└── sos.module.ts
```

### 4.3 Style

- **KHÔNG dùng `any`** — dùng `unknown` rồi narrowing
- **KHÔNG dùng `console.log`** — dùng NestJS `Logger`
- **KHÔNG throw raw Error** — dùng NestJS exceptions (`BadRequestException`, `NotFoundException`...)
- **async/await** everywhere — không `.then()` chain
- **Early return** — tránh nested if/else
- Import dùng **barrel exports** (`index.ts`) cho từng folder
- **Script files**: Các file chạy script/tool (như `.js`, `.py`, `.sh`) **BẮT BUỘC** phải được lưu ở ngoài thư mục `src/` (ví dụ: trong thư mục `scripts/` hoặc gốc dự án).

---

## 5. DATABASE — Quy tắc thiết kế

### 5.1 Bắt buộc cho MỌI bảng nghiệp vụ:

- Cột `province_id UUID FK → provinces` (multi-tenant)
- Cột `created_at TIMESTAMP DEFAULT NOW()`
- Cột `updated_at TIMESTAMP`
- Soft delete: `deleted_at TIMESTAMP` (nullable)
- GIST index trên mọi cột `geometry`
- B-tree index trên `status`, `created_at`, `province_id`

### 5.2 Geometry:

- Mọi đối tượng địa lý: `geometry(Point/Polygon/MultiPolygon, 4326)` — SRID 4326
- Spatial query dùng PostGIS functions: `ST_DWithin`, `ST_Distance`, `ST_Contains`...

### 5.3 Migration:

- **KHÔNG dùng `synchronize: true`** — luôn viết migration
- Migration file: `YYYYMMDDHHMMSS-MoTaNgan.ts`
- Mỗi migration phải có cả `up()` và `down()`

---

## 6. PHÂN QUYỀN — 7 Roles

```
SUPER_ADMIN (6) → Toàn quốc
PROVINCE_ADMIN (5) → 1 tỉnh
COORDINATOR (4) → 1 tỉnh, trực hệ thống 24/7
AREA_OFFICER (3) → Xã/Phường
TEAM_LEADER (2) → 1 đội cứu hộ
RESCUE_MEMBER (2) → Thành viên đội
RESIDENT (1) → Người dân
```

### Quy tắc phân quyền:

- JWT payload: `{ userId, role, provinceId }` — KHÔNG chứa data nhạy cảm
- Guard `@Roles(Role.COORDINATOR, Role.PROVINCE_ADMIN)` trên controller method
- RBAC bằng NestJS Guard + Decorator — **KHÔNG if-else trong controller**
- Mọi query tự filter `province_id` — **KHÔNG cross-province** trừ SUPER_ADMIN

---

## 7. ENUMS CHÍNH (Tham khảo nhanh)

```typescript
// User
enum Role { SUPER_ADMIN, PROVINCE_ADMIN, COORDINATOR, AREA_OFFICER, TEAM_LEADER, RESCUE_MEMBER, RESIDENT }
enum Gender { MALE, FEMALE, OTHER }

// SOS
enum SosRequestType { MEDICAL, FOOD, RESCUE, STUCK, OTHER }
enum SosStatus { PENDING, ASSIGNED, IN_PROGRESS, RESOLVED, FALSE_ALARM, CANCELLED }
enum SosSeverity { LOW, MEDIUM, HIGH, CRITICAL }
enum SosSource { APP, IOT_SMS, IOT_MQTT, WEB }
enum DispatchMethod { AUTO, MANUAL }

// Team
enum TeamType { DAN_PHONG, PCCC, QUAN_SU, TINH_NGUYEN, Y_TE, TONG_HOP }
enum TeamStatus { AVAILABLE, BUSY, OFF_DUTY, STANDBY }
enum TeamRole { LEADER, DEPUTY_LEADER, MEMBER }

// Report
enum FloodReportType { FLOODED_ROAD, RISING_WATER, FALLEN_TREE, POWER_OUT, LANDSLIDE, TRAFFIC_BLOCKED, OTHER }
enum ReportStatus { PENDING, VERIFIED, DISMISSED }

// Casualty
enum CasualtyStatus { DECEASED, INJURED, MISSING, SAFE, EVACUATED }
enum CasualtyCase { DROWNING, COLLAPSE, LANDSLIDE, ELECTRIC, OTHER, UNKNOWN }

// Disaster
enum DisasterType { FLOOD, STORM, LANDSLIDE, TIDAL_SURGE, DROUGHT, OTHER }
enum DisasterStatus { ONGOING, RESOLVED, ARCHIVED }

// Donation
enum DonorType { INDIVIDUAL, ORGANIZATION, ANONYMOUS }
enum DonationType { MONEY, GOODS, FOOD, MEDICINE, EQUIPMENT, OTHER }
enum DonationStatus { PLEDGED, RECEIVED, DISTRIBUTED, CANCELLED }

// Admin Unit
enum AdminUnitType { DISTRICT, COMMUNE, WARD, HAMLET }

// Infrastructure
enum InfraType { MANHOLE, DRAIN_LINE, CANAL, LEVEE, PUMPING_STATION, SHELTER, WASTE_SITE, TREE }
enum InfraStatus { NORMAL, DAMAGED, FLOODED, UNDER_MAINTENANCE, UNKNOWN }

// Weather
enum WeatherSource { OPEN_METEO, OPENWEATHERMAP, GDACS, NASA, NCHMF, MANUAL }
enum AlertType { HEAVY_RAIN, STORM, FLOOD, TROPICAL_DEPRESSION, TIDAL_SURGE }

// Message
enum MessageType { BROADCAST, GROUP, DIRECT, SYSTEM_ALERT }
enum MessageChannel { PUSH_NOTIFICATION, IN_APP, SMS, ALL }
enum TargetType { ALL_PROVINCE, SPECIFIC_AREA, TEAM, INDIVIDUAL, ROLE }
```

---

## 8. BUSINESS RULES QUAN TRỌNG (Tóm tắt)

| ID | Rule |
|----|------|
| BR-TENANT-01 | Mọi API request phải có `province_id` trong JWT. Guard tự inject. |
| BR-TENANT-02 | KHÔNG endpoint nào trả data cross-province (trừ SUPER_ADMIN). |
| BR-SOS-01 | SOS phải có tọa độ GPS hợp lệ. |
| BR-SOS-04 | 1 SOS = VÀNG. CCCD verified = hiện ngay. ≥3 SOS cùng cluster = ĐỎ. |
| BR-DISPATCH-02 | Score = distance×0.5 + active_cases×0.3 + skill_mismatch×0.2 |
| BR-DISPATCH-04 | Optimistic Locking (cột `version`) chống race condition. |
| BR-SEC-04 | RBAC bằng Guard + Decorator. KHÔNG if-else trong controller. |
| BR-SEC-05 | CCCD, sức khỏe → mã hóa AES-256 at-rest. |

> **Tra cứu đầy đủ:** Xem `PROJECT_RULES.md` mục 16.

---

## 9. WORKFLOW KHI NHẬN TASK

```
1. Đọc yêu cầu → xác định module nào bị ảnh hưởng
2. Kiểm tra entity/migration đã tồn tại chưa
3. Viết theo thứ tự:
   a. Domain entity + repository interface
   b. Application DTO + use-case
   c. Infrastructure TypeORM entity + repository implementation
   d. Presentation controller + guards
   e. NestJS module wiring
   f. Migration (nếu thay đổi DB)
4. Đảm bảo:
   - province_id scoped
   - RBAC guard trên controller
   - Validation bằng class-validator trên DTO
   - Error handling bằng NestJS exceptions
5. Chạy: npm run build → kiểm tra lỗi compile
```

---

## 10. ANTI-PATTERNS — KHÔNG LÀM

| ❌ KHÔNG | ✅ LÀM |
|----------|--------|
| Logic nghiệp vụ trong controller | Đặt trong use-case |
| `synchronize: true` | Viết migration |
| Import infrastructure trong domain | Dùng interface/port |
| Hardcode province_id | Lấy từ JWT qua Guard |
| `console.log` | `Logger` của NestJS |
| Trả raw entity ra API | Map sang Response DTO |
| `any` type | `unknown` + type guard |
| Xóa dữ liệu thật | Soft delete (`deleted_at`) |
| if-else check role trong controller | `@Roles()` decorator + Guard |
| Query không filter province | Luôn WHERE province_id = ? |

---

## 11. THAM KHẢO NHANH

- **Nghiệp vụ chi tiết:** `PROJECT_RULES.md`
- **DB Schema đầy đủ:** `PROJECT_RULES.md` mục 7 (21+ bảng)
- **ERD:** `PROJECT_RULES.md` mục 7.22
- **OpenSpec config:** `openspec/config.yaml`
- **Existing migrations:** Kiểm tra `src/infrastructure/database/migrations/`

---

> **Nguyên tắc vàng:** Code ít, đúng kiến trúc, đúng convention. Khi không chắc → hỏi, đừng đoán.
