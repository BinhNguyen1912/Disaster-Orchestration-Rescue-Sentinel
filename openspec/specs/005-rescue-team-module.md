# Feature: Rescue Team Management Module

## 1. Nghiệp vụ
> Quản lý đội cứu hộ (RescueTeam) và thành viên (RescueTeamMember) trong hệ thống Disaster Rescue Management.
> Module này thuộc **Phase 3 - Nghiệp vụ chính**, theo PROJECT_RULES.md rule #2 (OpenSpec workflow).

---

## 2. Tổng quan nghiệp vụ

### 2.1 RescueTeam Entity

Một đội cứu hộ thuộc một tỉnh, có:
- **Loại đội** (`teamType`): Dân phòng, PCCC, Quân sự, Tình nguyện, Y tế, Tổng hợp
- **Trạng thái** (`status`): AVAILABLE , BUSY, OFF_DUTY, STANDBY
- **Vị trí** (PostGIS geometry): `currentLocation` (vị trí hiện tại), `baseLocation` (trụ sở), `coverageArea` (vùng phụ trách)
- **Thông tin nhân sự**: `maxCapacity`, `leaderId`, `activeCasesCount`, `totalMissions`, `totalRescued`, `totalHoursActive`
- **Chuyên môn** (`specializationIds`) — mảng ID refer đến bảng `team_specialization`, ví dụ: `[1, 3, 5]`
- **Trang thiết bị** (`equipment`) — JSONB

### 2.2 TeamSpecialization Entity (BẢNG MỚI)

Bảng master data lưu danh sách chuyên môn của đội cứu hộ:

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `id` | int | PK |
| `code` | varchar(50) | Mã chuyên môn (duy nhất), ví dụ: `PCCC_CHUA_CHAY` |
| `name` | varchar(100) | Tên chuyên môn, ví dụ: `Chữa cháy` |
| `teamType` | TeamType | Loại đội mà chuyên môn này thuộc về |
| `description` | varchar(255) | Mô tả chi tiết |
| `isActive` | boolean | Active/deactivate |

**Seed data mẫu:**
```json
[
  { "code": "PCCC_CHUA_CHAY", "name": "Chữa cháy", "teamType": "PCCC" },
  { "code": "PCCC_CUU_HO", "name": "Cứu hộ", "teamType": "PCCC" },
  { "code": "YTE_SO_CUU", "name": "Sơ cấp cứu", "teamType": "Y_TE" },
  { "code": "YTE_TRIAGE", "name": "Phân loại bệnh nhân", "teamType": "Y_TE" },
  { "code": "DP_TIM_KIEM", "name": "Tìm kiếm cứu nạn", "teamType": "DAN_PHONG" }
]
```

### 2.4 RescueTeamMember Entity

Thành viên gia nhập đội:
- Mỗi **user chỉ thuộc tối đa 1 đội** tại một thời điểm (`userId` là unique trong bảng này)
- **Vai trò** (`roleInTeam`): LEADER, DEPUTY_LEADER, MEMBER
- **Ngày vào** (`joinedAt`) — bắt buộc
- **Ngày rời** (`leftAt`) — nullable, set khi rời đội
- **Trạng thái hoạt động** (`isActive`)
- **Thống kê cá nhân**: `missionsCount`, `rescuedCount`, `hoursActive`

---

## 3. API Contract

### 3.1 Tạo đội cứu hộ
```
POST /api/v1/rescue-teams
```

**Request DTO:**
```typescript
{
  provinceId: number;          // BẮT BUỘC — tỉnh mà đội thuộc về
  name: string;                // BẮT BUỘC — tên đầy đủ của đội
  teamType: TeamType;          // BẮT BUỘC — loại hình đội
  adminUnitId: number;         // BẮT BUỘC — đơn vị hành chính cấp quận/huyện
  baseLocation?: {              // PostGIS Point (SRID 4326)
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  coverageArea?: {              // PostGIS Polygon (SRID 4326)
    type: "Polygon";
    coordinates: number[][][];  // ring array
  };
  maxCapacity?: number;         // Số thành viên tối đa
  specializationIds?: number[]; // Mảng ID chuyên môn từ bảng team_specialization
  equipment?: object;          // JSON — trang thiết bị
}
```

**Business Rules:**
- `specializationIds` phải thuộc về `teamType` được chọn (validate theo bảng team_specialization)
Ok
**Response DTO (201):**
```typescript
{
  statusCode: 201,
  message: "RESCUE_TEAM_CREATED",
  data: RescueTeamResponseDto
}
```

### 3.2 Thêm thành viên vào đội
```
POST /api/v1/rescue-teams/:teamId/members
```

**Request DTO:**
```typescript
{
  userId: number;              // BẮT BUỘC — user cần thêm
  roleInTeam: RoleInTeam;       // BẮT BUỘC — vai trò trong đội
  specializations?: string[];   // Chuyên môn của thành viên
}
```

**Business Rules:**
- `userId` không được đã thuộc đội khác đang hoạt động (isActive = true)
- Mỗi đội chỉ có tối đa 1 LEADER
- LEADER mới phải set `leaderId` cho RescueTeam

**Response DTO (201):**
```typescript
{
  statusCode: 201,
  message: "MEMBER_ADDED",
  data: RescueTeamMemberResponseDto
}
```

### 3.3 Lấy danh sách đội cứu hộ (có phân trang + lọc)
```
GET /api/v1/rescue-teams
```

**Query Parameters:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page` | number | Trang (default: 1) |
| `limit` | number | Số item/trang (default: 20, max: 100) |
| `provinceId` | number | Lọc theo tỉnh |
| `status` | TeamStatus | Lọc theo trạng thái |
| `teamType` | TeamType | Lọc theo loại đội |
| `search` | string | Tìm kiếm theo tên/mã |
| `availableOnly` | boolean | Chỉ đội đang AVAILABLE |

**Response DTO (200):**
```typescript
{
  statusCode: 200,
  message: "OK",
  data: {
    items: RescueTeamResponseDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  }
}
```

### 3.4 Lấy chi tiết một đội
```
GET /api/v1/rescue-teams/:teamId
```

**Response DTO (200):**
```typescript
{
  statusCode: 200,
  message: "OK",
  data: RescueTeamDetailResponseDto  // includes members array
}
```

### 3.5 Cập nhật đội cứu hộ
```
PATCH /api/v1/rescue-teams/:teamId
```

**Request DTO:** (partial update — các field gửi lên mới được cập nhật)
```typescript
{
  name?: string;
  status?: TeamStatus;
  currentLocation?: { type: "Point"; coordinates: [number, number] };
  maxCapacity?: number;
  specializationIds?: number[];
  equipment?: object;
}
```

### 3.6 Cập nhật vị trí hiện tại của đội
```
PATCH /api/v1/rescue-teams/:teamId/location
```

**Request DTO:**
```typescript
{
  currentLocation: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  status?: TeamStatus; // Optional — có thể cập nhật status cùng lúc
}
```

### 3.7 Xóa thành viên khỏi đội
```
DELETE /api/v1/rescue-teams/:teamId/members/:memberId
```

**Business Rules:**
- LEADER không thể bị xóa nếu chưa có MEMBER nào khác trong đội
- Đặt `leftAt = now` và `isActive = false` (soft delete — không xóa hẳn record)

### 3.8 Rời đội (self-leave)
```
POST /api/v1/rescue-teams/leave
```

**Request DTO:**
```typescript
{
  userId: number;
}
```

### 3.9 Chuyển vai trò thành viên
```
PATCH /api/v1/rescue-teams/:teamId/members/:memberId/role
```

**Request DTO:**
```typescript
{
  roleInTeam: RoleInTeam;
}
```

**Business Rules:**
- Mỗi đội chỉ có tối đa 1 LEADER. Khi назначить LEADER mới, LEADER cũ chuyển thành MEMBER
- Khi LEADER rời đội, hệ thống tự động назначить DEPUTY_LEADER mới (nếu có)

### 3.10 Xóa đội cứu hộ
```
DELETE /api/v1/rescue-teams/:teamId
```

**Business Rules:**
- Đội không có activeCasesCount > 0 (đang có nhiệm vụ)
- Đội phải không có thành viên đang active

### 3.11 Lấy danh sách thành viên của đội
```
GET /api/v1/rescue-teams/:teamId/members
```

**Query Parameters:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| `isActive` | boolean | Lọc theo trạng thái hoạt động |

---

## 4. Business Rules áp dụng

- `BR-RT-01`: Mỗi user chỉ thuộc **tối đa 1 đội đang active** tại một thời điểm
- `BR-RT-02`: Mỗi đội chỉ có tối đa **1 LEADER**
- `BR-RT-03`: Khi gán LEADER mới → LEADER cũ tự động chuyển thành MEMBER
- `BR-RT-04`: Khi LEADER rời đội → DEPUTY_LEADER đầu tiên được promoted lên LEADER (nếu có)
- `BR-RT-05`: Xóa thành viên = soft delete (`leftAt`, `isActive = false`), không xóa record
- `BR-RT-06`: Xóa đội chỉ được khi `activeCasesCount = 0` và không có thành viên active , Nhưng mà có thể cho flexible là xóa luôn , Phía Front end sẽ tự display thông báo cho người dùng
- `BR-RT-07`: Đội bị giới hạn bởi `maxCapacity` — không thể thêm thành viên vượt quá, tôi muốn flexible(trong trường hợp khẩn cấp vẫn cho vào luôn )
- `BR-RT-08`: Province Scope — user chỉ thấy/xem đội thuộc tỉnh mình (trừ SYSTEM_ADMIN)

---

## 5. Entities / Bảng bị ảnh hưởng

**Đọc:**
- `province` — kiểm tra tỉnh hợp lệ
- `administrative_unit` — kiểm tra adminUnitId hợp lệ
- `user` — kiểm tra user tồn tại, đã có đội chưa
- `rescue_team` — kiểm tra team tồn tại, mã đội trùng
- `rescue_team_member` — kiểm tra thành viên đã thuộc đội khác chưa

**Ghi:**
- `rescue_team` — tạo mới, cập nhật, xóa
- `rescue_team_member` — tạo mới, cập nhật soft-delete, cập nhật vai trò
- `team_specialization` — đọc (chỉ dùng cho validation, không sửa)

**Entity mới:**
- `TeamSpecializationEntity` — bảng master data chuyên môn

---

## 6. Permissions cần thiết

Sử dụng Permission Guard đã có (`@RequirePermissions()`):

| Action | Permission Code |
|--------|----------------|
| Tạo đội | `rescue_team:create` |
| Xem danh sách đội | `rescue_team:read` |
| Xem chi tiết đội | `rescue_team:read` |
| Cập nhật đội | `rescue_team:update` |
| Cập nhật vị trí đội | `rescue_team:update` |
| Xóa đội | `rescue_team:delete` |
| Thêm thành viên | `rescue_team:manage_members` |
| Xóa thành viên | `rescue_team:manage_members` |
| Chuyển vai trò | `rescue_team:manage_members` |
| Rời đội | (owner/self — không cần permission) |

**Lưu ý Province Scope:** Query tự động filter theo `provinceId` của user trong JWT, trừ SYSTEM_ADMIN được full access.

---

## 7. DTOs cần tạo

```
src/presentation/dtos/rescue-team/
├── create-rescue-team.dto.ts
├── update-rescue-team.dto.ts
├── update-rescue-team-location.dto.ts
├── add-member.dto.ts
├── update-member-role.dto.ts
├── rescue-team-response.dto.ts
├── rescue-team-detail-response.dto.ts
├── rescue-team-member-response.dto.ts
└── query-rescue-team.dto.ts

src/presentation/dtos/team-specialization/
├── team-specialization-response.dto.ts
└── query-team-specialization.dto.ts
```

---

## 8. Repository Interface cần tạo

```
src/domain/repositories/
├── rescue-team.repository.interface.ts
├── rescue-team-member.repository.interface.ts
└── team-specialization.repository.interface.ts
```

**IRescueTeamRepository:**
- `findById(id)` — tìm đội theo ID
- `findAll(filters, pagination)` — tìm tất cả với filter + phân trang
- `create(data)` — tạo mới
- `update(id, data)` — cập nhật
- `delete(id)` — xóa
- `countActiveCases(teamId)` — đếm nhiệm vụ đang active

**IRescueTeamMemberRepository:**
- `findByTeamId(teamId, isActive?)` — lấy danh sách thành viên
- `findByUserId(userId)` — tìm thành viên theo userId
- `create(data)` — tạo mới
- `update(id, data)` — cập nhật
- `softDelete(id)` — set leftAt + isActive = false
- `countActiveMembers(teamId)` — đếm thành viên active
- `findLeaderByTeamId(teamId)` — tìm LEADER của đội

**ITeamSpecializationRepository:**
- `findById(id)` — tìm theo ID
- `findByIds(ids)` — tìm nhiều theo IDs
- `findByTeamType(teamType)` — lấy danh sách theo loại đội
- `findAll()` — lấy tất cả

---

## 9. Thứ tự implement

- [ ] **Bước 1:** Tạo `IRescueTeamRepository` interface + `IRescueTeamMemberRepository` interface trong `domain/repositories/`
- [ ] **Bước 2:** Tạo TypeORM implementations trong `infrastructure/database/repositories/`
- [ ] **Bước 3:** Tạo DTOs trong `presentation/dtos/rescue-team/`
- [ ] **Bước 4:** Tạo `RescueTeamService` trong `application/services/`
- [ ] **Bước 5:** Tạo `RescueTeamController` trong `presentation/controllers/`
- [ ] **Bước 6:** Tạo `RescueTeamModule` — đăng ký all, import vào `AppModule`
- [ ] **Bước 7:** Cập nhật `PROGRESS.md` và `progress.html`

---

## 10. Edge Cases / Lưu ý đặc biệt

1. **Thành viên đã thuộc đội khác** → Throw 409 Conflict (`"USER_ALREADY_IN_TEAM"`)
2. **Xóa LEADER cuối cùng mà chỉ có 1 thành viên** → Đổi luôn team.leaderId = null
3. **Cập nhật location khi đội đang BUSY** → Cho phép, vì đội vẫn di chuyển được trong nhiệm vụ
4. **PostGIS geometry validation** → Dùng `@IsGeoPoint()` / `@IsGeoPolygon()` decorator tự tạo, validate SRID = 4326
5. **specializationIds không thuộc teamType** → Throw 400 BadRequest (`"INVALID_SPECIALIZATION_FOR_TEAM_TYPE"`)


Tôi muốn đổi một chút xíu 
code: string;  //Mã đội tôi muốn random , hoặc sẽ có một mã quy chuẩn gì đó 
=> Tôi đang phân vân không biết nên tạo 1 bảng chuyên môn không , sau đó sẽ gán vào thay vì ghi code thủ công
---

## 11. Cấu trúc thư mục kết quả

```
src/
├── domain/
│   ├── entities/
│   │   ├── rescue-team.ts              ✅ đã có
│   │   ├── rescue-team-member.ts        ✅ đã có
│   │   └── team-specialization.ts      🆕
│   └── repositories/
│       ├── rescue-team.repository.interface.ts         🆕
│       ├── rescue-team-member.repository.interface.ts   🆕
│       └── team-specialization.repository.interface.ts 🆕
├── infrastructure/
│   └── database/
│       ├── entities/
│       │   ├── rescue-team.entity.ts              ✅ đã có
│       │   ├── rescue-team-member.entity.ts      ✅ đã có
│       │   └── team-specialization.entity.ts      🆕
│       └── repositories/
│           ├── rescue-team.repository.ts          🆕
│           ├── rescue-team-member.repository.ts  🆕
│           └── team-specialization.repository.ts 🆕
├── application/
│   └── services/
│       ├── rescue-team.service.ts         🆕
│       └── team-specialization.service.ts 🆕
└── presentation/
    ├── controllers/
    │   ├── rescue-team.controller.ts      🆕
    │   └── team-specialization.controller.ts 🆕
    └── dtos/
        ├── rescue-team/
        │   ├── create-rescue-team.dto.ts           🆕
        │   ├── update-rescue-team.dto.ts           🆕
        │   ├── update-location.dto.ts             🆕
        │   ├── add-member.dto.ts                  🆕
        │   ├── update-member-role.dto.ts         🆕
        │   ├── rescue-team-response.dto.ts        🆕
        │   ├── rescue-team-detail-response.dto.ts 🆕
        │   ├── rescue-team-member-response.dto.ts 🆕
        │   └── query-rescue-team.dto.ts           🆕
        └── team-specialization/
            ├── team-specialization-response.dto.ts 🆕
            └── query-team-specialization.dto.ts   🆕
```


