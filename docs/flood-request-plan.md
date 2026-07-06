# Backend Implementation Plan v2 — Module `flood-request`

> **Phiên bản cải thiện** — Đã cập nhật theo review comments.

---

## Tổng Quan

Người dân gửi **Yêu cầu ngập lụt** (flood request) từ app/web. Module này **hoàn toàn tách biệt** với `sos-request`.

| Purpose | Luồng Admin | Kết quả |
|---|---|---|
| `DECLARE_ONLY` | Xem → Duyệt / Từ chối | Điểm ngập hiện/ẩn trên bản đồ |
| `REQUEST_SUPPORT` | Xem → Điều phối Auto/Manual | Tạo `sos_request` mới + gọi `DispatchOrchestratorService` |

---

## 1. Quyết Định Kiến Trúc

Module này **tái sử dụng** các service đã có:

| Service tái sử dụng | Mục đích |
|---|---|
| `DispatchOrchestratorService` | Điều phối tự động khi REQUEST_SUPPORT được duyệt |
| `SosRequestService.create()` | Tạo bản ghi SOS mới khi dispatch |
| `WebSocketGateway` | Push realtime khi có request mới hoặc được xử lý |

---

## 2. Thay đổi so với v1 theo Review

### ❌ Bỏ trường `code`
Không cần sinh code `REQ-2026-0001`. Dùng `id` SERIAL (auto-increment) làm định danh duy nhất.
- FE hiển thị dạng `#1234` thay vì chuỗi code phức tạp
- Đơn giản hơn, không cần logic sinh code trong service

### ✅ History table — Thêm FK hữu ích
Bảng `flood_request_status_history` cũ chỉ join được 2 bảng:
- `flood_request_id` → `flood_request`
- `changed_by` → `users`

Sau review, thêm 2 FK có giá trị:
- `sos_id` — Khi status chuyển thành `DISPATCHED`, ghi luôn ID của SOS vừa tạo vào history row đó. FE đọc được link trực tiếp tới SOS từ timeline.
- `rescue_team_id` — Khi dispatch thủ công, ghi luôn team được chọn vào history. Để xem lịch sử "đội nào được giao lần này".

---

## 3. Enums Mới

### floodRequestPurpose.enum.ts
```typescript
export enum FloodRequestPurpose {
  DECLARE_ONLY    = 'DECLARE_ONLY',
  REQUEST_SUPPORT = 'REQUEST_SUPPORT',
}
```

### floodRequestStatus.enum.ts
```typescript
export enum FloodRequestStatus {
  PENDING    = 'PENDING',    // Vừa gửi lên, Admin chưa xem
  VERIFYING  = 'VERIFYING',  // Admin đang xem xét / xác minh thực địa
  APPROVED   = 'APPROVED',   // Admin duyệt (DECLARE_ONLY → hiện trên map)
  REJECTED   = 'REJECTED',   // Admin từ chối
  DISPATCHED = 'DISPATCHED', // REQUEST_SUPPORT: đã tạo SOS + dispatch đội
}
```

Thêm vào `shared/index.ts`:
```typescript
export * from './core/enums/floodRequestPurpose.enum';
export * from './core/enums/floodRequestStatus.enum';
```

---

## 4. TypeORM Entities

### flood-request.entity.ts (đã bỏ `code`)

```typescript
@Entity('flood_request')
export class FloodRequestEntity {
  @PrimaryGeneratedColumn()
  id: number; // Dùng id làm định danh, không cần code riêng

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ── Người gửi ──
  @Column({ type: 'int', nullable: true })
  requesterId?: number; // null nếu gửi anonymous (không có tài khoản)

  @Column({ length: 100 })
  requesterName: string;

  @Column({ length: 20 })
  requesterPhone: string;

  // ── Vị trí địa lý ──
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: any; // [lng, lat] — PostGIS format

  @Column({ type: 'int' })
  provinceId: number; // Admin tỉnh dùng để filter theo tỉnh mình

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ length: 255, nullable: true })
  locationName?: string;

  @Column({ type: 'text', nullable: true })
  addressDetail?: string;

  // ── Thông tin hiện trường ──
  @Column({ type: 'enum', enum: Severity })
  severity: Severity;

  @Column({ type: 'int', nullable: true })
  floodDepthCmMin?: number; // FE ghép thành "50 - 80 cm"

  @Column({ type: 'int', nullable: true })
  floodDepthCmMax?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedAreaHa?: number; // FE format thành "~ 1.5 ha"

  @Column({ length: 100, nullable: true })
  roadType?: string;

  @Column({ length: 255, nullable: true })
  impact?: string;

  @Column({ length: 100, nullable: true })
  weather?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', array: true, default: [] })
  imageUrls: string[];

  // ── Phân loại — quyết định toàn bộ luồng ──
  @Column({ type: 'enum', enum: FloodRequestPurpose })
  purpose: FloodRequestPurpose;

  // ── Trạng thái ──
  @Column({ type: 'enum', enum: FloodRequestStatus, default: FloodRequestStatus.PENDING })
  status: FloodRequestStatus;

  @Column({ type: 'boolean', default: false })
  isApprovedForMap: boolean; // DECLARE_ONLY: hiện điểm ngập trên map công cộng

  // ── Admin xử lý ──
  @Column({ type: 'int', nullable: true })
  reviewedBy?: number;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string;

  // ── Liên kết SOS (sau khi dispatch) ──
  @Column({ type: 'int', nullable: true })
  linkedSosId?: number; // Trỏ tới SOS vừa được tạo tự động

  @Column({ type: 'enum', enum: DispatchMethod, nullable: true })
  dispatchMethod?: DispatchMethod; // AUTO | MANUAL — tái dùng enum đã có

  // ── Nguồn gốc ──
  @Column({ type: 'enum', enum: SosSource, default: SosSource.MOBILE_APP })
  source: SosSource;

  @Column({ length: 200, nullable: true })
  deviceInfo?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Relations ──
  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province?: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit?: AdministrativeUnitEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'requesterId' })
  requester?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: UserEntity;

  @ManyToOne(() => SosRequestEntity, { nullable: true })
  @JoinColumn({ name: 'linkedSosId' })
  linkedSos?: SosRequestEntity;

  @OneToMany(() => FloodRequestStatusHistoryEntity, h => h.floodRequest)
  statusHistory: FloodRequestStatusHistoryEntity[];
}
```

---

### flood-request-status-history.entity.ts (đã thêm FK sos + team)

```typescript
@Entity('flood_request_status_history')
export class FloodRequestStatusHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // ── FK chính ──
  @Column({ type: 'int' })
  floodRequestId: number; // Join về bảng flood_request

  // ── Thay đổi trạng thái ──
  @Column({ length: 50, nullable: true })
  fromStatus?: string; // null nếu là lần đầu tiên (tạo mới → PENDING)

  @Column({ length: 50 })
  toStatus: string;

  // ── Ai thực hiện ──
  @Column({ type: 'int', nullable: true })
  changedBy?: number; // FK → users. null = hệ thống tự đổi (auto-dispatch)

  @CreateDateColumn()
  changedAt: Date;

  @Column({ type: 'text', nullable: true })
  note?: string; // Ghi chú kèm theo, FE dùng để render timeline

  // ── FK bổ sung — hữu ích khi query từ history ──
  @Column({ type: 'int', nullable: true })
  sosId?: number;
  // Được set khi toStatus = DISPATCHED.
  // Cho phép FE link thẳng tới SOS từ dòng history, không cần join qua flood_request

  @Column({ type: 'int', nullable: true })
  rescueTeamId?: number;
  // Được set khi dispatch thủ công (MANUAL).
  // Cho phép xem lịch sử "lần này đội nào được giao" ngay trong timeline

  // ── Relations ──
  @ManyToOne(() => FloodRequestEntity, fr => fr.statusHistory)
  @JoinColumn({ name: 'floodRequestId' })
  floodRequest: FloodRequestEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'changedBy' })
  changer?: UserEntity;

  @ManyToOne(() => SosRequestEntity, { nullable: true })
  @JoinColumn({ name: 'sosId' })
  sos?: SosRequestEntity;

  @ManyToOne(() => RescueTeamEntity, { nullable: true })
  @JoinColumn({ name: 'rescueTeamId' })
  rescueTeam?: RescueTeamEntity;
}
```

**Tóm tắt các FK có trong history:**

| FK | Join tới | Khi nào có giá trị |
|---|---|---|
| `floodRequestId` | `flood_request` | Luôn có — đây là FK bắt buộc |
| `changedBy` | `users` | Khi admin thực hiện thay đổi (null = hệ thống) |
| `sosId` | `sos_request` | Chỉ khi `toStatus = DISPATCHED` |
| `rescueTeamId` | `rescue_team` | Chỉ khi dispatch MANUAL |

---

## 5. API Endpoints

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| POST | `/flood-requests` | Public | Người dân gửi yêu cầu |
| GET | `/flood-requests` | FLOOD_REQUEST_READ | Admin xem danh sách (filter, paginate) |
| GET | `/flood-requests/my` | JWT | Người dân xem request của mình |
| GET | `/flood-requests/:id` | FLOOD_REQUEST_READ | Xem chi tiết |
| PATCH | `/flood-requests/:id/status` | FLOOD_REQUEST_UPDATE | Đổi → VERIFYING hoặc REJECTED |
| POST | `/flood-requests/:id/approve-map` | FLOOD_REQUEST_UPDATE | DECLARE_ONLY: duyệt lên map |
| POST | `/flood-requests/:id/dispatch` | FLOOD_REQUEST_UPDATE | REQUEST_SUPPORT: dispatch đội |
| GET | `/flood-requests/:id/history` | FLOOD_REQUEST_READ | Timeline lịch sử xử lý |

---

## 6. Business Logic

### Luồng DECLARE_ONLY
```
POST /flood-requests { purpose: DECLARE_ONLY }  → PENDING
  PATCH /:id/status { status: VERIFYING }        → VERIFYING
  POST /:id/approve-map                          → APPROVED + is_approved_for_map=true
  PATCH /:id/status { status: REJECTED }         → REJECTED
```

### Luồng REQUEST_SUPPORT
```
POST /flood-requests { purpose: REQUEST_SUPPORT } → PENDING
  PATCH /:id/status { status: VERIFYING }          → VERIFYING
  POST /:id/dispatch { method: AUTO }
    1. SosRequestService.create()
    2. DispatchOrchestratorService.assignTeam(sosId, {})
    3. Ghi history row: toStatus=DISPATCHED, sosId=<new>, rescueTeamId=null
    4. Update flood_request: linkedSosId, dispatchMethod=AUTO, status=DISPATCHED
  POST /:id/dispatch { method: MANUAL, teamId: 5 }
    1. SosRequestService.create()
    2. DispatchOrchestratorService.assignTeam(sosId, { teamId: 5 })
    3. Ghi history row: toStatus=DISPATCHED, sosId=<new>, rescueTeamId=5
    4. Update flood_request: linkedSosId, dispatchMethod=MANUAL, status=DISPATCHED
```

### Validations
- `approve-map` chỉ cho `purpose === DECLARE_ONLY`, throw 400 nếu sai
- `dispatch` chỉ cho `purpose === REQUEST_SUPPORT`, throw 400 nếu sai
- `dispatch { method: MANUAL }` bắt buộc `teamId`, throw 400 nếu thiếu
- Không dispatch khi `status === DISPATCHED`, throw 409

---

## 7. Migration SQL (đã bỏ cột code)

```sql
CREATE TABLE flood_request (
  id                  SERIAL PRIMARY KEY,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  requester_id        INT REFERENCES users(id) ON DELETE SET NULL,
  requester_name      VARCHAR(100) NOT NULL,
  requester_phone     VARCHAR(20) NOT NULL,
  location            GEOMETRY(Point, 4326) NOT NULL,
  province_id         INT NOT NULL REFERENCES provinces(id),
  admin_unit_id       INT NOT NULL REFERENCES administrative_units(id),
  location_name       VARCHAR(255),
  address_detail      TEXT,
  severity            VARCHAR(20) NOT NULL,
  flood_depth_cm_min  INT,
  flood_depth_cm_max  INT,
  estimated_area_ha   DECIMAL(10,2),
  road_type           VARCHAR(100),
  impact              VARCHAR(255),
  weather             VARCHAR(100),
  notes               TEXT,
  image_urls          VARCHAR[] DEFAULT '{}',
  purpose             VARCHAR(30) NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  is_approved_for_map BOOLEAN DEFAULT false,
  reviewed_by         INT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMP,
  review_notes        TEXT,
  linked_sos_id       INT REFERENCES sos_request(id) ON DELETE SET NULL,
  dispatch_method     VARCHAR(20),
  source              VARCHAR(30) NOT NULL DEFAULT 'MOBILE_APP',
  device_info         VARCHAR(200),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_flood_request_province   ON flood_request(province_id);
CREATE INDEX idx_flood_request_status     ON flood_request(status);
CREATE INDEX idx_flood_request_purpose    ON flood_request(purpose);
CREATE INDEX idx_flood_request_location   ON flood_request USING GIST(location);
CREATE INDEX idx_flood_request_created_at ON flood_request(created_at DESC);

CREATE TABLE flood_request_status_history (
  id               SERIAL PRIMARY KEY,
  flood_request_id INT NOT NULL REFERENCES flood_request(id) ON DELETE CASCADE,
  from_status      VARCHAR(50),
  to_status        VARCHAR(50) NOT NULL,
  changed_by       INT REFERENCES users(id) ON DELETE SET NULL,
  changed_at       TIMESTAMP DEFAULT NOW(),
  note             TEXT,
  sos_id           INT REFERENCES sos_request(id) ON DELETE SET NULL,
  rescue_team_id   INT REFERENCES rescue_team(id) ON DELETE SET NULL
);
CREATE INDEX idx_frsh_request_id ON flood_request_status_history(flood_request_id);
```

---

## 8. Permissions Mới

```typescript
FLOOD_REQUEST_READ:   'flood_request:read',
FLOOD_REQUEST_UPDATE: 'flood_request:update',
```

Gán:
- `ADMIN_PROVINCE`: READ + UPDATE (auto-filter theo `provinceId` của họ)
- `ADMIN` trung ương: Tất cả

---

## 9. Checklist Thực Hiện

- [ ] **1** Tạo 2 enum + cập nhật shared/index.ts
- [ ] **2** Tạo 2 TypeORM entity (không có cột code, history có sosId + rescueTeamId)
- [ ] **3** Chạy migration SQL
- [ ] **4** Xây domain interface FloodRequest
- [ ] **5** Xây IFloodRequestRepository + FloodRequestRepositoryImpl
- [ ] **6** Xây FloodRequestService (create, findAll, findById, findByRequesterId, updateStatus, approveForMap, dispatch, getHistory)
- [ ] **7** Xây FloodRequestController (8 endpoints)
- [ ] **8** Thêm permissions + gán role
- [ ] **9** Tạo FloodRequestModule + đăng ký app.module.ts
- [ ] **10** Compile check + Swagger test

---

## 10. FE — Kết Nối Sau Khi BE Xong

Tạo `fe/src/apis/flood-request.api.ts` rồi thay trong:

```typescript
// SosRequestListPage.tsx:
const { data } = useQuery({
  queryKey: ['flood-requests', filters],
  queryFn: () => floodRequestApi.getAll(filters),
});

// RequestDetail.tsx dispatch endpoints:
// Auto:   POST /flood-requests/:id/dispatch { method: 'AUTO' }
// Manual: POST /flood-requests/:id/dispatch { method: 'MANUAL', teamId }
// Map:    POST /flood-requests/:id/approve-map
// Status: PATCH /flood-requests/:id/status
```
