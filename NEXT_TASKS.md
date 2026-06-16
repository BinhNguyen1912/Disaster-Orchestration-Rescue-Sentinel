# Next Tasks — Disaster Rescue Management System

> **Ngày tạo:** 2026-06-05
> **Cập nhật:** 2026-06-05 - Rescue Team Member fixes

---

## 🔍 Issues tìm thấy & Cách Fix

### Issue 1: `userId` đang `unique: true` → 1 user chỉ thuộc 1 đội

**Fix:** Bỏ `unique: true`, thêm `nullable: true`

```typescript
// Before
@Column({ type: 'int', unique: true })
userId: number;

// After
@Column({ type: 'int', nullable: true })
userId: number | null;
```

**Thêm fields mới:** `citizenName`, `citizenPhone` để ghi nhận người dân không có tài khoản

---

### Issue 2: TypeScript Errors - Interface/Entity mismatch

**Các lỗi TypeScript:**
1. `leaderId: number | null` không assign được vào `leaderId?: number`
2. `RescueTeamMemberEntity` thiếu `citizenName`, `citizenPhone`
3. Return types không match giữa interface và implementation

**Cách Fix nhanh:**
- Chuyển Service trả về `any` tạm thời (đánh dấu TODO cần mapper)
- Hoặc implement proper mapper classes (cần thêm thời gian)

---

### Issue 3: Flow thêm member cần cập nhật

**Before:** Check user đã có account, đã thuộc đội nào chưa
**After:** 
- Nếu có `userId` → kiểm tra tài khoản tồn tại
- Nếu có `citizenName` → cho phép ghi nhận người dân không có tài khoản
- Một người có thể thuộc nhiều đội

**Validations cần có:**
1. `userId` HOẶC `citizenName` bắt buộc (không thể thiếu cả hai)
2. Kiểm tra `citizenName + citizenPhone` đã tồn tại trong team đó chưa

---

### Issue 4: Các methods cần cập nhật

| Method | Issue | Fix |
|--------|-------|-----|
| `findByUserId` | Chưa handle `userId` là null | Return null nếu `!userId` |
| `findByCitizenInfo` | Chưa có method này | Thêm mới |
| `addMember` | Kiểm tra unique user cũ | Đổi sang check citizen hoặc userId |
| `updateMemberRole` | Leader assign cần handle `userId` là null | Fix null check |
| `leaveTeam` | Nếu userId là null không thể leave | Chỉ user có account mới leaveTeam được |

---

### Issue 5: Leader assignment khi không có userId

**Problem:** Nếu add member với `citizenName` (không có `userId`) và role là LEADER, thì:
- `leaderId` trong `RescueTeamEntity` vẫn expect `number`
- Không thể assign leader khi không có user

**Fix options:**
1. Chỉ cho phép LEADER khi có `userId` (member phải có account)
2. Hoặc cho phép `leaderId` nullable, hiển thị "Citizen Leader" trong response

**Đề xuất:** Option 1 - Restrict LEADER phải có tài khoản

---

## 📊 Phân tích Modules Hiện Tại

### ✅ Modules đã hoàn thành (basic CRUD / core workflow):

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| Auth | ✅ Hoàn thành | JWT + Refresh Token + OTP Email |
| Rescue Team | ✅ Hoàn thành | CRUD + Members |
| Team Specialization | ✅ Hoàn thành | CRUD (standalone module) |
| Location | ✅ Basic | Chỉ CRUD theo province |
| Role | ✅ Basic | CRUD đơn giản |
| SOS Request | ✅ Hoàn thành | Gửi SOS (Guest/User), Phân bổ, Hủy, Tìm lân cận |
| Media Upload | ✅ Hoàn thành | Cloudflare R2 Upload (In-memory streams) |

---

## 🎯 Module cNâng cấp TRƯỚC TIÊN

### ✅ Rescue Team Member - Đang Fix

**Mục tiêu:** 
- [x] Bỏ `unique: true` trên `userId` để 1 user có thể thuộc nhiều đội
- [x] Thêm `citizenName`, `citizenPhone` cho người dân không có tài khoản
- [x] Fix `addMember` validation
- [x] Fix TypeScript errors (cần mapper hoặc type casting)
- [x] Viết unit tests
- [x] Update Postman collection

### ⏳ Cần làm tiếp theo sau Rescue Team Member

1. **Verify code flow `addMember`** hoạt động đúng
2. [x] **Unit tests cho `RescueTeamMember`**
3. **Update Postman** với payload mới cho add member

---

## 🚀 Module MỚI triển khai TIẾP THEO

### Priority 1: SOS Request Module (CORE BUSINESS)

---

## 📊 Phân tích Modules Hiện Tại

### ✅ Modules đã hoàn thành (basic CRUD / core workflow):

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| Auth | ✅ Hoàn thành | JWT + Refresh Token + OTP Email |
| Rescue Team | ✅ Hoàn thành | CRUD + Members |
| Team Specialization | ✅ Hoàn thành | CRUD (standalone module) |
| Location | ✅ Basic | Chỉ CRUD theo province |
| Role | ✅ Basic | CRUD đơn giản |
| SOS Request | ✅ Hoàn thành | Gửi SOS (Guest/User), Phân bổ, Hủy, Tìm lân cận |
| Media Upload | ✅ Hoàn thành | Cloudflare R2 Upload (In-memory streams) |

---

## 🎯 Module cần NÂNG CẤP TRƯỚC

### 1. Location Module → Location Module (Nâng cao)

**Hiện tại:** CRUD theo province đơn giản

**Cần thêm:**
- [ ] **Spatial queries**: Tìm đội cứu hộ trong bán kính X km (ST_Distance)
- [ ] **Reverse geocoding**: Tọa độ → địa chỉ
- [ ] **Geo-fencing**: Cảnh báo khi đội vào/vùng nguy hiểm
- [ ] **Province center coordinates**: Trả về lat/lng để center map

### 2. Rescue Team Module → Rescue Team Module (Nâng cao)

**Hiện tại:** CRUD + member management

**Cần thêm:**
- [ ] **Spatial tracking**: Cập nhật vị trí real-time với PostGIS Point
- [ ] **Auto-dispatch ready**: Chuẩn bị query tìm đội gần nhất
- [ ] **Statistics**: Tính toán hiệu suất (tỷ lệ cứu thành công, thời gian phản ứng)
- [ ] **Status transitions**: AVAILABLE → DISPATCHED → ON_SITE → COMPLETED

---

## 🚀 Module MỚI triển khai TIẾP THEO

### Priority 1: SOS Request Module (CORE BUSINESS)

**Mô tả:** Module xử lý tín hiệu cầu cứu khẩn cấp

**SOS Flow:**
```
1. User gửi SOS (tọa độ GPS, loại emergency: lũ lụt, cháy, tai nạn...)
   ↓
2. Hệ thống query PostGIS tìm đội cứu hộ gần nhất + status = AVAILABLE
   ↓
3. Auto-assign: Gán đội vào SOS request → status: DISPATCHED
   ↓
4. WebSocket: Thông báo cho đội được assign + cho user biết đội đang đến
   ↓
5. Đội xác nhận tiếp nhận → status: ON_SITE
   ↓
6. Tracking real-time vị trí đội đến hiện trường (UpdateLocation)
   ↓
7. Hoàn thành → cập nhật Casualty (nếu có) + Statistics
```

**Endpoints cần có:**
- [x] `POST /sos-requests` — Gửi SOS (public)
- [x] `GET /sos-requests` — Danh sách SOS (filter by status, province, date range)
- [x] `GET /sos-requests/:id` — Chi tiết
- [x] `PATCH /sos-requests/:id/status` — Cập nhật status (dispatcher/leader)
- [x] `PATCH /sos-requests/:id/assign` — Auto-assign đội gần nhất / Reassign
- [x] `DELETE /sos-requests/:id` — Hủy SOS (user hoặc admin)
- [x] `GET /sos-requests/nearby` — Tìm SOS requests gần một tọa độ
- [ ] `GET /sos-requests/stats` — Thống kê SOS theo thời gian/khu vực

**Business Rules:**
- [x] Chỉ tìm đội có `status = AVAILABLE` và `teamType` phù hợp với `emergencyType`
- [ ] Tính khoảng cách từ đội đến SOS location dùng PostGIS `ST_Distance`
- [ ] Ưu tiên đội có `activeCasesCount < maxCapacity`
- [ ] SOS status flow: PENDING → DISPATCHED → ON_SITE → RESOLVED hoặc CANCELLED

### Priority 2: Flood Report Module

**Phụ thuộc:** Location Module nâng cao (PostGIS)

**Chức năng:**
- [ ] User báo cáo lũ (tọa độ, mức nước, hình ảnh)
- [ ] Admin xác minh báo cáo
- [ ] Tích hợp với SOS nếu cần cứu hộ khẩn cấp

### Priority 3: Casualty & Disaster Event

**Module phụ thuộc:** SOS Module

- [ ] Casualty: Ghi nhận thương vong từ các vụ tai nạn/SOS
- [ ] Disaster Event: Tổng hợp các sự kiện thiên tai

---

## 📝 Ghi chú kỹ thuật

### PostGIS functions sử dụng:
```sql
-- Tìm đội trong bán kính X km
ST_Distance(team.currentLocation, sos.location)::float / 1000 AS distance_km

-- Cập nhật vị trí
ST_SetSRID(ST_MakePoint(lng, lat), 4326)
```

### WebSocket events:
- `sos:new` — SOS mới được gửi (gửi cho admin và các đội trong khu vực)
- `sos:assigned` — Đội được assign vào SOS (gửi cho đội và user)
- `sos:status_changed` — Status thay đổi
- `team:location_updated` — Vị trí đội cập nhật (tracking)

### Enum EmergencyType mapping TeamType:
| EmergencyType | TeamType |
|--------------|----------|
| FLOOD | Y_TE (Y tế) |
| FIRE | PCCC |
| TRAFFIC_ACCIDENT | CSGT |
| MEDICAL_EMERGENCY | Y_TE |
| NATURAL_DISASTER | PGD (Phòng gió dịch) |

---

## ✅ Checklist triển khai

### Phase 3.1: Location Nâng cao (Pre-requisite)
- [x] Thêm spatial query methods vào LocationRepository
- [x] Thêm endpoint `GET /locations/search?lat=&lng=&radius=`
- [x] Test PostGIS distance queries

### Phase 3.2: SOS Request Module
- [x] Tạo module `modules/sos-request/`
- [x] Entity + Repository + Service + Controller
- [x] Auto-dispatch logic với PostGIS
- [ ] WebSocket integration

### Phase 3.3: Rescue Team Nâng cao
- [x] Thêm status transition logic
- [ ] Thêm statistics methods
- [x] Cập nhật RescuTeamRepository với spatial queries

---

> **Lưu ý:** SOS Module là core business — không nên bỏ qua auto-dispatch và WebSocket




### NOTE BỔ SUNG TỪ NGƯỜI DÙNG (KHÔNG PHẢI AI NOTE) 
** LƯU Ý : NẾU TASK NÀO HOÀN THÀNH THÊM (X) SAU MỤC TÔI GHI ĐỂ TÔI BIẾT NHA


1. Hiện tại khi người dùng login , chưa biết được là User đăng nhập từ thiết bị gì 