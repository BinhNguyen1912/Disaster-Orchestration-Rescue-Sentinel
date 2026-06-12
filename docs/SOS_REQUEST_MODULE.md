# SOS Request Module Specification

> **Ngày tạo:** 2026-06-11
> **Module:** SOS Request (Core Business)
> **Trạng thái:** Spec Updated with Anti-Spam & Role Constraints

---

## Mục đích

Module xử lý tín hiệu cầu cứu khẩn cấp từ người dân (người dùng đã đăng nhập hoặc khách vãng lai) khi gặp sự cố thiên tai, bão lũ, tai nạn... gửi thông tin định vị, bằng chứng hình ảnh và kết nối trực tiếp đến các đội cứu hộ

---

## Các Entity liên quan

| Entity | Mô tả | Liên quan |
|--------|-------|-----------|
| `SOSRequest` | Thông tin yêu cầu SOS | Core entity |
| `User` | Người gửi (nếu đã đăng nhập) | `requesterId` (nullable) → User |
| `RescueTeam` | Đội cứu hộ được gán | `assignedTeamId` (nullable) → RescueTeam |
| `Province` | Tỉnh/Thành Phố | `provinceId` → Province |
| `AdministrativeUnit` | Phường/Xã/Quận/Huyện | `adminUnitId` → AdministrativeUnit |
| `Casualty` | Ghi nhận thương vong tại hiện trường | `casualties` (OneToMany) |

---

## Enums & Types

### 1. SosRequestType
```typescript
export enum SosRequestType {
  FLOOD = 'FLOOD',               // Lũ lụt, ngập nước
  FIRE_FIGHTING = 'FIRE_FIGHTING', // Cháy rừng, cháy nhà
  TRAFFIC_ACCIDENT = 'TRAFFIC_ACCIDENT', // Tai nạn giao thông
  MEDICAL_EMERGENCY = 'MEDICAL_EMERGENCY', // Cấp cứu y tế
  NATURAL_DISASTER = 'NATURAL_DISASTER', // Bão, động đất
  OTHER = 'OTHER',
}
```

### 2. SosStatus
```typescript
export enum SosStatus {
  PENDING = 'PENDING',       // Chờ được gán đội
  DISPATCHED = 'DISPATCHED', // Đã gán đội, đang di chuyển
  ON_SITE = 'ON_SITE',       // Đội cứu hộ đã tiếp cận hiện trường
  RESOLVED = 'RESOLVED',     // Đã hoàn thành/xử lý xong
  CANCELLED = 'CANCELLED',   // Bị hủy
}
```

### 3. Severity
```typescript
export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL', // Nguy kịch tính mạng
}
```

---

## Business Rules & Kiến trúc hệ thống

### 1. Cơ chế chống Spam (Anti-Spam Rules)
Để ngăn ngừa các tín hiệu SOS giả mạo hoặc spam làm nghẽn hệ thống cứu hộ:
*   **Bắt buộc ảnh minh chứng hiện trường:** Payload yêu cầu gửi SOS bắt buộc phải chứa ít nhất 1 ảnh thực tế tại hiện trường (`imageUrls` không được rỗng) để làm minh chứng thực tế.
*   **Không giới hạn cứng số điện thoại:** Cho phép một số điện thoại gửi nhiều SOS khác nhau (để hỗ trợ gửi hộ trong vùng bão lũ cho người già, trẻ em không có thiết bị hoặc hết pin).
*   **IP Rate Limiting:** Giới hạn tối đa 3 yêu cầu SOS trong vòng 10 phút trên cùng một địa chỉ IP để tránh các đợt tấn công tự động (DDoS/Spam).

### 2. Phân quyền và ràng buộc Tỉnh thành (`provinceId`)
*   **SYSTEM_ADMIN (Admin tổng):** Được phép truy vấn danh sách SOS trên toàn quốc, không bắt buộc truyền `provinceId` trong Query.
*   **PROVINCE_ADMIN (Admin tỉnh) & Đội trưởng/Tình nguyện viên:**
    *   Hệ thống sẽ **luôn tự động lọc hoặc đính kèm** `provinceId` thuộc phạm vi quản lý của tài khoản đó (lấy từ thông tin đăng nhập trong JWT).
    *   Chặn không cho truy cập hoặc thao tác các SOS thuộc các tỉnh khác.
*   **Người dân thường (USER):** Chỉ được xem danh sách SOS do chính mình gửi.

### 3. Quy trình tự hủy SOS (Self-Cancellation)
Người dân gặp nạn được phép tự hủy yêu cầu cứu hộ nếu tình hình đã ổn định hoặc họ đã tự thoát thân an toàn (ví dụ: được thuyền dân chài cứu trước khi đội chuyên nghiệp tới).
*   **Điều kiện trạng thái:** Cho phép tự hủy khi yêu cầu đang ở trạng thái `PENDING` (chờ gán) hoặc `DISPATCHED` (đã gán đội, đội đang di chuyển).
*   **Giải phóng tài nguyên (Release Resource):** Khi hủy ở trạng thái `DISPATCHED`, hệ thống sẽ lập tức cập nhật trạng thái của Đội cứu hộ được gán về `AVAILABLE` (Sẵn sàng) và gửi thông báo WebSocket để đội quay đầu cứu hộ ca khác, tránh lãng phí thời gian di chuyển.
*   **Khóa hủy từ phía người dùng:** Khi trạng thái chuyển sang `ON_SITE` (đội cứu hộ đã tiếp cận hiện trường) hoặc `RESOLVED`, người dùng không được tự ý hủy trên ứng dụng nữa. Việc hoàn thành hoặc hủy lúc này phải do **Đội trưởng (Rescue Team Leader)** xác nhận sau khi kiểm tra trực tiếp.
*   **Lý do hủy:** Người dùng bắt buộc phải nhập lý do hủy (`cancelReason`).

### 4. Thiết kế mở cho thuật toán Auto-Dispatch (Grab-like)
Để thuận tiện cho việc phát triển và tự nâng cấp thuật toán tìm kiếm/phân phối đội cứu hộ theo mô hình Grab (Matchmaking), hệ thống sử dụng **Strategy Pattern**:
*   Khai báo interface `IDispatchStrategy`:
    ```typescript
    export interface IDispatchStrategy {
      assignTeam(sosRequest: SosRequestEntity, forceTeamId?: number): Promise<number | null>;
    }
    ```
*   Tạo lớp triển khai mặc định `DistanceBasedDispatchStrategy`: Tìm các đội có `status = AVAILABLE`, có chuyên môn `teamType` phù hợp với `sosRequestType`, và chọn đội gần nhất dựa trên PostGIS `ST_Distance`.
*   Các thuật toán nâng cao hơn (ví dụ: quét bán kính mở rộng tuần tự, kiểm tra năng lực tải tối đa `maxCapacity`, điều phối dựa trên mức độ nghiêm trọng) sẽ được cài đặt thành các Class chiến lược khác mà không cần sửa cấu trúc chính của API.

### 5. Tách biệt thông tin Tĩnh (HouseholdProfile) và thông tin Động (Hiện trường SOS)
Để thông tin cứu hộ chính xác nhất tại thời điểm xảy ra sự cố:
*   **Hồ sơ hộ gia đình (Tĩnh):** Được khai báo trước lúc bình thường. Giao diện gửi SOS sẽ sử dụng dữ liệu này làm dữ liệu điền sẵn (pre-fill) để tiết kiệm thời gian cho người dân.
*   **Chi tiết yêu cầu SOS (Động):** Phía client cho phép chỉnh sửa nhanh số người thực tế đang kẹt và các tình trạng đặc biệt ngay lúc đó (ví dụ: một số thành viên không có ở nhà, hoặc có thêm người lánh nạn). Dữ liệu này được lưu độc lập trực tiếp vào bảng `sos_request` thông qua các trường `trappedPeopleCount` và `specialNeedsTags`.

---

## API Endpoints Specification

### 1. Gửi yêu cầu SOS (Public - Không bắt buộc Auth)
*   **Endpoint:** `POST /api/v1/sos-requests`
*   **Headers:** `Content-Type: application/json`
*   **Payload:**
```json
{
  "requesterName": "Nguyễn Văn A",
  "requesterPhone": "0917234567",
  "requestType": "FLOOD",
  "latitude": 10.7589,
  "longitude": 106.7004,
  "description": "Nước dâng cao ngập tầng trệt, có người già cần hỗ trợ",
  "severity": "HIGH",
  "provinceId": 1,
  "adminUnitId": 12,
  "trappedPeopleCount": 3,
  "specialNeedsTags": ["ELDERLY", "OXYGEN_REQUIRED"],
  "imageUrls": [
    "https://storage.rescue.gov.vn/sos/2026/img1293.jpg"
  ]
}
```
*   **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 201,
    "requesterName": "Nguyễn Văn A",
    "requesterPhone": "0917234567",
    "requestType": "FLOOD",
    "status": "PENDING",
    "severity": "HIGH",
    "location": {
      "type": "Point",
      "coordinates": [106.7004, 10.7589]
    },
    "provinceId": 1,
    "adminUnitId": 12,
    "trappedPeopleCount": 3,
    "specialNeedsTags": ["ELDERLY", "OXYGEN_REQUIRED"],
    "imageUrls": [
      "https://storage.rescue.gov.vn/sos/2026/img1293.jpg"
    ],
    "createdAt": "2026-06-11T07:30:00.000Z"
  }
}
```

---

### 2. Truy vấn danh sách SOS (Yêu cầu đăng nhập)
*   **Endpoint:** `GET /api/v1/sos-requests`
*   **Query Parameters:**
    *   `provinceId` (number, bắt buộc đối với cấp Tỉnh/Đội cứu hộ, Admin tổng có thể bỏ qua).
    *   `status` (enum: PENDING, DISPATCHED, ON_SITE, RESOLVED, CANCELLED).
    *   `sosRequestType` (enum).
    *   `severity` (enum).
    *   `assignedTeamId` (number).
    *   `page` (number, default: 1).
    *   `limit` (number, default: 20).

---

### 3. Tìm kiếm SOS lân cận (Dành cho đội cứu hộ di động)
*   **Endpoint:** `GET /api/v1/sos-requests/nearby`
*   **Query Parameters:**
    *   `lat` (number, bắt buộc) - Vĩ độ hiện tại.
    *   `lng` (number, bắt buộc) - Kinh độ hiện tại.
    *   `radius` (number, default: 5) - Bán kính quét (km).
    *   `status` (enum, default: PENDING).
*   **PostGIS Query thực thi dưới DB:**
```sql
SELECT sos.*, 
       ST_Distance(sos.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000 AS distance_km
FROM sos_request sos
WHERE ST_DWithin(sos.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius * 1000)
  AND sos.status = :status
ORDER BY distance_km ASC
```

---

### 4. Đội cứu hộ cập nhật trạng thái SOS
*   **Endpoint:** `PATCH /api/v1/sos-requests/:id/status`
*   **Payload:**
```json
{
  "status": "ON_SITE",
  "resolutionNotes": "Đội cứu hộ tiếp cận hiện trường lúc 14:45"
}
```

---

### 5. Điều phối đội cứu hộ (Auto-assign / Manual-assign)
*   **Endpoint:** `PATCH /api/v1/sos-requests/:id/assign`
*   **Payload:**
```json
{
  "teamId": 32 // Nếu không truyền, hệ thống sẽ kích hoạt IDispatchStrategy để tự động tìm và gán đội
}
```

---

### 6. Người dân hủy yêu cầu cứu hộ (Self-cancellation)
*   **Endpoint:** `DELETE /api/v1/sos-requests/:id`
*   **Payload:**
```json
{
  "reason": "Gia đình đã tự di chuyển đến nơi an toàn bằng thuyền cá nhân."
}
```

---

## WebSocket Real-time Events

| Tên Event | Trigger khi | Gửi đến | Dữ liệu kèm theo |
|-----------|-------------|---------|------------------|
| `sos:new` | Có yêu cầu SOS mới | Admin hệ thống + Các đội trong tỉnh | Chi tiết yêu cầu SOS + Tọa độ |
| `sos:assigned` | Được gán đội cứu hộ | Đội được gán + Người dân gặp nạn | Thông tin SOS + Thông tin Đội cứu hộ |
| `sos:status_changed` | Trạng thái SOS thay đổi | Người dân gặp nạn + Admin | ID của SOS + Trạng thái mới |
| `team:location_updated` | Đội cứu hộ cập nhật tọa độ | Người dân gặp nạn (của SOS đang xử lý) | Tọa độ real-time của đội cứu hộ |

---

## Lộ trình triển khai (Tasks Checklist)

*   [ ] **1. Đồng bộ Database Schema:** Chỉnh sửa [sos-request.entity.ts](file:///d:/DoAn/DOAN/be/src/infrastructure/database/entities/sos-request.entity.ts) để thêm `requesterName`, `requesterPhone` và chuyển `requesterId` thành nullable.
*   [ ] **2. Khởi tạo cấu trúc Module:** Tạo thư mục `modules/sos-request/` bao gồm đầy đủ cấu trúc 3 layer.
*   [ ] **3. Viết DTOs và Validate dữ liệu:** Thiết lập các ràng buộc chống spam (ảnh minh chứng bắt buộc, kiểm tra định dạng toạ độ GPS).
*   [ ] **4. Triển khai Service & Đăng ký Strategy:** 
    *   Viết logic State Machine quản lý vòng đời trạng thái SOS.
    *   Định nghĩa Interface `IDispatchStrategy` và hiện thực phiên bản `DistanceBasedDispatchStrategy`.
*   [ ] **5. Tích hợp Phân quyền:** Lọc SOS theo `provinceId` dựa trên JWT Payload của người đăng nhập.
*   [ ] **6. Truy vấn Không gian (Spatial Queries):** Viết API tìm SOS lân cận dùng PostGIS.
*   [ ] **7. Tích hợp WebSockets:** Bắn thông báo real-time khi có sự thay đổi trạng thái SOS.
*   [ ] **8. Kiểm thử:** Viết Unit tests & Cập nhật Postman collection.