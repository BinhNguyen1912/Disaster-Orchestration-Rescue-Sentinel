# OpenSpec: RescueTeamMember Module (Standalone)

> **Version:** 1.0.0
> **Created:** 2026-06-05
> **Status:** Draft → Ready for Extraction
> **Bounded Context:** RescueTeamMember
> **Module Type:** Standalone Module (tách từ rescue-team)

---

## 1. Mục tiêu tách module

### 1.1 Lý do
- **Single Responsibility** - mỗi module quản lý 1 aggregate root duy nhất
- **Microservice Ready** - tách thành service riêng khi cần scale
- **Independent Deployment** - deploy độc lập không ảnh hưởng rescue-team

### 1.2 Cấu trúc hiện tại (cần tách)
```
rescue-team/ (HIỆN TẠI)
├── domain/entities/rescue-team-member.ts  ← CẦN TÁCH
├── domain/entities/rescue-team.ts
├── domain/repositories/rescue-team-member.repository.interface.ts  ← CẦN TÁCH
├── domain/repositories/rescue-team.repository.interface.ts
├── application/services/rescue-team.service.ts  ← GIỮ LẠI
└── application/services/rescue-team-member.service.ts  ← CẦN TÁCH
```

### 1.3 Cấu trúc sau khi tách
```
src/modules/
├── rescue-team/                     # CHỈ quản lý RescueTeam
│   ├── domain/
│   │   ├── entities/rescue-team.ts
│   │   └── repositories/rescue-team.repository.interface.ts
│   ├── application/
│   │   └── services/rescue-team.service.ts
│   └── presentation/
│       └── controllers/rescue-team.controller.ts
│
├── rescue-team-member/             # MỚI - quản lý RescueTeamMember
│   ├── domain/
│   │   ├── entities/rescue-team-member.ts
│   │   └── repositories/rescue-team-member.repository.interface.ts
│   ├── application/
│   │   ├── services/rescue-team-member.service.ts
│   │   ├── dtos/
│   │   └── interfaces/
│   ├── infrastructure/
│   │   └── persistence/repositories/
│   │       └── rescue-team-member.repository.ts
│   └── presentation/
│       └── controllers/rescue-team-member.controller.ts
│
└── team-specialization/            # ĐÃ TÁCH (2026-06-05)
```

---

## 2. Domain Model

### 2.1 Entity: RescueTeamMember
```typescript
// src/modules/rescue-team-member/domain/entities/rescue-team-member.ts
export interface RescueTeamMember {
  id: number;
  teamId: number;

  // Identity: PHẢI có ít nhất 1
  userId: number | null;           // null = citizen
  citizenName: string | null;       // required if userId is null
  citizenPhone: string | null;

  // Role
  roleInTeam: RoleInTeam;
  joinedAt: Date;
  leftAt: Date | null;
  isActive: boolean;

  // Stats (cho PROFESSIONAL teams)
  specializationIds: number[];
  missionsCount: number;
  rescuedCount: number;
  hoursActive: number;
}

export enum RoleInTeam {
  LEADER = 'LEADER',
  DEPUTY_LEADER = 'DEPUTY_LEADER',
  MEMBER = 'MEMBER',
}
```

### 2.2 Repository Interface
```typescript
// src/modules/rescue-team-member/domain/repositories/rescue-team-member.repository.interface.ts
export interface IRescueTeamMemberRepository {
  findById(id: number): Promise<RescueTeamMember | null>;
  findByUserId(userId: number): Promise<RescueTeamMember | null>;
  findByTeamId(teamId: number, filters?: { isActive?: boolean }): Promise<PaginatedResult<RescueTeamMember>>;
  findByCitizenInfo(teamId: number, citizenName: string, citizenPhone?: string): Promise<RescueTeamMember | null>;
  findLeaderByTeamId(teamId: number): Promise<RescueTeamMember | null>;
  countActiveMembers(teamId: number): Promise<number>;
  create(data: Partial<RescueTeamMember>): Promise<RescueTeamMember>;
  update(id: number, data: Partial<RescueTeamMember>): Promise<RescueTeamMember | null>;
  softDelete(id: number): Promise<boolean>;
}
```

---

## 3. API Contract

### Base Path: `/team-members`

### 3.1 Commands

#### POST /teams/:teamId/members
Thêm thành viên vào đội

```json
// Request
{
  "userId": 5,                      // optional
  "citizenName": "Nguyễn Văn Tèo", // optional
  "citizenPhone": "0912345678",     // optional
  "roleInTeam": "MEMBER",
  "specializationIds": [1, 2]       // optional
}

// Response 201
{
  "id": 1,
  "teamId": 1,
  "userId": null,
  "citizenName": "Nguyễn Văn Tèo",
  "citizenPhone": "0912345678",
  "roleInTeam": "MEMBER",
  "joinedAt": "2026-06-05T10:00:00Z",
  "isActive": true
}
```

**Business Rules:**
- ✅ Phải có userId HOẶC citizenName
- ✅ Nếu là LEADER → gọi RescueTeamService cập nhật leaderInfo
- ✅ Citizen duplicate trong team → 409 Conflict

---

#### DELETE /teams/:teamId/members/:memberId
Xóa thành viên (soft delete)

**Business Rules:**
- Member phải thuộc team đó
- ❌ Không xóa được thành viên cuối cùng
- ✅ Nếu xóa LEADER → promote DEPUTY_LEADER

---

#### PATCH /teams/:teamId/members/:memberId/role
Thay đổi vai trò

```json
// Request
{ "roleInTeam": "DEPUTY_LEADER" }
```

**Business Rules:**
- ✅ LEADER mới vẫn cần userId HOẶC citizenName
- ✅ Thăng MEMBER → LEADER: LEADER cũ xuống MEMBER
- ✅ Hạ LEADER → MEMBER: không auto-promote ai

---

#### POST /teams/leave
User tự rời đội

```json
// Request (userId từ JWT)
{}
```

**Business Rules:**
- ✅ LEADER + thành viên cuối → clear leaderInfo
- ✅ LEADER + có DEPUTY → DEPUTY lên LEADER
- ✅ Không còn ai → team không có LEADER

---

### 3.2 Queries

#### GET /teams/:teamId/members
```json
// Query: ?isActive=true
{
  "items": [...],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

## 4. Integration

### 4.1 RescueTeam Service (Required)
```typescript
// Gọi qua event hoặc direct injection (trong cùng process)
// Khi add/remove LEADER → cập nhật team.leaderId, team.leaderCitizenName

interface IRescueTeamCommands {
  updateLeader(teamId: number, leaderInfo: LeaderInfo): Promise<void>;
}

interface LeaderInfo {
  leaderId?: number;
  leaderCitizenName?: string;
  leaderPhone?: string;
}
```

### 4.2 TeamSpecialization Service
```typescript
// validate specializationIds khi add member cho PROFESSIONAL team
interface ITeamSpecializationService {
  findByIds(ids: number[]): Promise<TeamSpecialization[]>;
}
```

---

## 5. Database Schema (Giữ nguyên)

```sql
CREATE TABLE rescue_team_member (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES rescue_team(id),

  user_id INT REFERENCES users(id),       -- NULL = citizen
  citizen_name VARCHAR(255),
  citizen_phone VARCHAR(20),

  role_in_team VARCHAR(20) NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  specialization_ids INT[],
  missions_count INT DEFAULT 0,
  rescued_count INT DEFAULT 0,
  hours_active INT DEFAULT 0,

  CONSTRAINT chk_identity CHECK (
    (user_id IS NOT NULL) OR (citizen_name IS NOT NULL)
  )
);

CREATE INDEX idx_member_team ON rescue_team_member(team_id);
CREATE INDEX idx_member_user ON rescue_team_member(user_id);
CREATE INDEX idx_member_active ON rescue_team_member(is_active);
```

---

## 6. Extraction Steps

### Step 1: Create new module structure
```bash
src/modules/rescue-team-member/
├── domain/
│   ├── entities/rescue-team-member.ts
│   └── repositories/rescue-team-member.repository.interface.ts
├── application/
│   ├── services/rescue-team-member.service.ts
│   ├── dtos/
│   └── interfaces/
├── infrastructure/
│   └── persistence/repositories/
│       └── rescue-team-member.repository.ts
└── presentation/
    └── controllers/rescue-team-member.controller.ts
```

### Step 2: Copy & adapt files
- [ ] Copy `rescue-team-member.entity.ts` → `domain/entities/rescue-team-member.ts`
- [ ] Copy `rescue-team-member.repository.interface.ts` → domain
- [ ] Copy `rescue-team-member.repository.ts` → infrastructure
- [ ] Extract member logic từ `rescue-team.service.ts` → `rescue-team-member.service.ts`
- [ ] Copy DTOs for member management
- [ ] Create new controller for member endpoints

### Step 3: Update RescueTeam module
- [ ] Remove member-related code từ `rescue-team.service.ts`
- [ ] Remove member repository import
- [ ] Import `RescueTeamMemberModule` thay thế

### Step 4: Update app.module.ts
```typescript
@Module({
  imports: [
    RescueTeamModule,
    RescueTeamMemberModule,    // ← Thêm
    TeamSpecializationModule,
    // ...
  ]
})
export class AppModule {}
```

### Step 5: Update references
- [ ] Update `IRescueTeamRepository` → remove member methods
- [ ] Update `IRescueTeamService` → remove member methods
- [ ] Update Postman collection

---

## 7. Open Questions

| # | Câu hỏi | Đề xuất |
|---|----------|---------|
| 1 | User có thuộc bao nhiêu teams? | Unlimited |
| 2 | Citizen có thuộc bao nhiêu teams? | 1 team tại 1 thời điểm |
| 3 | Cần lưu lịch sử thành viên? | Có - dùng isActive=false thay vì xóa |
| 4 | Events hay direct call? | Direct call (trong process) → event (cross-service) |

---

## 8. References

- Entity hiện tại: `src/infrastructure/database/entities/rescue-team-member.entity.ts`
- Repository interface hiện tại: `src/modules/rescue-team/domain/repositories/rescue-team-member.repository.interface.ts`
- Service hiện tại: `src/modules/rescue-team/application/services/rescue-team.service.ts` (phần member)
