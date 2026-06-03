# RULES — Disaster Rescue System (Backend)

> **Purpose:** Provide minimal yet sufficient context for AI to code accurately. Do NOT read PROJECT_RULES.md unless you need detailed business logic.

---

## 1. PROJECT

- **Name:** Disaster Rescue Management & Dispatch System
- **Type:** Multi-tenant SaaS scoped by Province (63 provinces in Vietnam)
- **Products:** Web Admin (Next.js) · Mobile (React Native + Expo) · IoT (ESP32)
- **This repo:** Backend API

---

## 2. TECH STACK (Backend)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | NestJS 11 + TypeScript | Clean Architecture |
| DB | PostgreSQL 15 + PostGIS 3 | Multi-tenant via `province_id` |
| ORM | TypeORM | Migration-based, no sync |
| Cache/Queue | Redis + BullMQ | |
| Real-time | Socket.io | WebSocket gateway |
| IoT | Mosquitto MQTT | |
| Auth | JWT + RBAC | 7 roles, province-scoped |
| Storage | Cloudflare R2 | S3-compatible |
| Module | `nodenext` | tsconfig: module & moduleResolution |
| Formatter | Prettier | singleQuote, trailingComma: all |
| Linter | ESLint flat config | typescript-eslint + prettier |

---

## 3. ARCHITECTURE — Clean Architecture

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

### Mandatory Architecture Rules:

1. **Dependency Rule:** `domain ← application ← infrastructure / presentation`. Domain MUST NOT import any other layer.
2. **Controllers must be thin:** Validate input → call use-case → return response. NO business logic.
3. **1 Use-case = 1 file = 1 class** with an `execute()` method.
4. **Repository Pattern:** Domain defines interface, Infrastructure implements.
5. **`ProvinceScope` Guard** on EVERY controller — auto-injects `province_id` from JWT.

---

## 4. CODE CONVENTIONS

### 4.1 Naming

| What | Convention | Example |
|------|-----------|---------|
| File | kebab-case | `create-sos-request.use-case.ts` |
| Class | PascalCase | `CreateSosRequestUseCase` |
| Interface | Prefix `I` | `ISosRequestRepository` |
| DTO | Suffix `Dto` | `CreateSosRequestDto` |
| Entity (domain) | PascalCase, no suffix | `SosRequest` |
| Entity (TypeORM) | Suffix `Entity` | `SosRequestEntity` |
| Enum | UPPER_SNAKE | `SosStatus.IN_PROGRESS` |
| DB column | snake_case | `province_id`, `created_at` |
| Method | camelCase | `findByProvinceId()` |

### 4.2 File Structure per Module

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

- **NO `any`** — use `unknown` then narrow
- **NO `console.log`** — use NestJS `Logger`
- **NO raw Error throws** — use NestJS exceptions (`BadRequestException`, `NotFoundException`...)
- **async/await** everywhere — no `.then()` chains
- **Early return** — avoid nested if/else
- Use **barrel exports** (`index.ts`) per folder
- **Script files**: Any execution script/tool (e.g. `.js`, `.py`, `.sh`) **MUST** be placed outside the `src/` directory (e.g. in a `scripts/` folder or project root).

---

## 5. DATABASE — Design Rules

### 5.1 Mandatory for ALL business tables:

- Column `province_id UUID FK → provinces` (multi-tenant)
- Column `created_at TIMESTAMP DEFAULT NOW()`
- Column `updated_at TIMESTAMP`
- Soft delete: `deleted_at TIMESTAMP` (nullable)
- GIST index on all `geometry` columns
- B-tree index on `status`, `created_at`, `province_id`

### 5.2 Geometry:

- All geospatial objects: `geometry(Point/Polygon/MultiPolygon, 4326)` — SRID 4326
- Spatial queries use PostGIS functions: `ST_DWithin`, `ST_Distance`, `ST_Contains`...

### 5.3 Migrations:

- **NEVER use `synchronize: true`** — always write migrations
- Migration file: `YYYYMMDDHHMMSS-ShortDescription.ts`
- Every migration must have both `up()` and `down()`

---

## 6. AUTHORIZATION — 7 Roles

```
SUPER_ADMIN (6) → Nationwide
PROVINCE_ADMIN (5) → 1 province
COORDINATOR (4) → 1 province, 24/7 operations
AREA_OFFICER (3) → Commune/Ward level
TEAM_LEADER (2) → 1 rescue team
RESCUE_MEMBER (2) → Team member
RESIDENT (1) → Citizen
```

### Auth Rules:

- JWT payload: `{ userId, role, provinceId }` — NO sensitive data
- Guard: `@Roles(Role.COORDINATOR, Role.PROVINCE_ADMIN)` on controller methods
- RBAC via NestJS Guard + Decorator — **NO if-else role checks in controllers**
- All queries auto-filter by `province_id` — **NO cross-province access** except SUPER_ADMIN

---

## 7. KEY ENUMS (Quick Reference)

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

## 8. CRITICAL BUSINESS RULES (Summary)

| ID | Rule |
|----|------|
| BR-TENANT-01 | Every API request must have `province_id` in JWT. Guard auto-injects. |
| BR-TENANT-02 | NO endpoint returns cross-province data (except SUPER_ADMIN). |
| BR-SOS-01 | SOS must have valid GPS coordinates. |
| BR-SOS-04 | 1 SOS = YELLOW. Verified CCCD = show immediately. ≥3 SOS same cluster = RED. |
| BR-DISPATCH-02 | Score = distance×0.5 + active_cases×0.3 + skill_mismatch×0.2 |
| BR-DISPATCH-04 | Optimistic Locking (`version` column) to prevent race conditions. |
| BR-SEC-04 | RBAC via Guard + Decorator. NO if-else in controllers. |
| BR-SEC-05 | National ID, health info → AES-256 encryption at-rest. |

> **Full reference:** See `PROJECT_RULES.md` section 16.

---

## 9. TASK WORKFLOW

```
1. Read requirement → identify affected module(s)
2. Check if entity/migration already exists
3. Code in order:
   a. Domain entity + repository interface
   b. Application DTO + use-case
   c. Infrastructure TypeORM entity + repository implementation
   d. Presentation controller + guards
   e. NestJS module wiring
   f. Migration (if DB schema changes)
4. Ensure:
   - province_id scoped
   - RBAC guard on controller
   - Validation via class-validator on DTOs
   - Error handling via NestJS exceptions
5. Run: npm run build → verify no compile errors
```

---

## 10. ANTI-PATTERNS — DO NOT

| ❌ DON'T | ✅ DO |
|----------|------|
| Business logic in controller | Put in use-case |
| `synchronize: true` | Write migrations |
| Import infrastructure in domain | Use interface/port |
| Hardcode province_id | Get from JWT via Guard |
| `console.log` | NestJS `Logger` |
| Return raw entity from API | Map to Response DTO |
| `any` type | `unknown` + type guard |
| Delete real data | Soft delete (`deleted_at`) |
| if-else role check in controller | `@Roles()` decorator + Guard |
| Query without province filter | Always WHERE province_id = ? |

---

## 11. QUICK REFERENCES

- **Detailed business logic:** `PROJECT_RULES.md`
- **Full DB Schema:** `PROJECT_RULES.md` section 7 (21+ tables)
- **ERD:** `PROJECT_RULES.md` section 7.22
- **OpenSpec config:** `openspec/config.yaml`
- **Existing migrations:** Check `src/infrastructure/database/migrations/`

---

> **Golden rule:** Write less code, follow the architecture, follow conventions. When unsure → ask, don't guess.
