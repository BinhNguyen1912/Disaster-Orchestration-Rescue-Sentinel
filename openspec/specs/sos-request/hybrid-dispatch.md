# Feature: Hybrid & Event-Driven Asynchronous Dispatch Flow

## 1. Nghiệp vụ
Tích hợp thư viện `@nestjs/event-emitter` để chuyển đổi cơ chế tự động tìm đội từ đồng bộ/quét nền định kỳ sang bất đồng bộ hướng sự kiện ngay khi tạo SOS. Triển khai mô hình điều phối lai (Hybrid Dispatch):
- **Giai đoạn 1:** Khi có SOS mới, phát WebSocket event `sos:offer` mời Top 3 đội rảnh tiếp cận cứu hộ trong 30 giây.
- **Giai đoạn 2:** Nếu hết 30 giây mà không đội nào nhận, tự động gán cưỡng bức cho đội tốt nhất hoặc phát còi báo động đỏ `sos:no-team-available` cho Admin.

Tham chiếu:
- `be/docs/PROJECT_RULES.md` (Mục 4.2 và Mục 16)
- `be/docs/final-dispatch-strategy.md`

---

## 2. API Contract & Socket.io Events

### API Endpoints:
Không thay đổi REST API cũ, nhưng sửa đổi hành vi xử lý ngầm (Asynchronous).

### WebSocket Events (`/dispatch` Namespace):

#### 1. Lời mời nhận ca (Server -> Client)
*   **Event Name:** `sos:offer`
*   **Target Room:** `team:${teamId}:leader` (chỉ gửi riêng tới tài khoản **Đội trưởng** của từng đội thuộc Top 3 để đảm bảo quyền chỉ huy)
*   **Payload:**
    ```typescript
    {
      sosId: number,
      latitude: number,
      longitude: number,
      severity: string,
      requestType: string,
      description: string,
      timeoutSeconds: number // Mặc định: 30
    }
    ```

#### 2. Đồng ý nhận ca (Client -> Server)
*   **Event Name:** `sos:claim`
*   **Payload:**
    ```typescript
    {
      sosId: number,
      teamId: number
    }
    ```

#### 3. Thông báo đã gán đội thành công (Server -> Client)
*   **Event Name:** `sos:offer-claimed`
*   **Target Room:** `province:${provinceId}` (Báo cho Admin tỉnh để cập nhật bản đồ), đồng thời bắn sự kiện gán việc chính thức `sos:assigned` tới toàn bộ thành viên trong đội qua room `team:${teamId}` để cả đội cùng di chuyển.
*   **Payload:**
    ```typescript
    {
      sosId: number,
      assignedTeamId: number
    }
    ```

---

## 3. Business Rules áp dụng
- `BR-DISPATCH-03`: Tải trọng tối đa của mỗi đội và kiểm tra trạng thái hoạt động rảnh rỗi (`AVAILABLE` / `STANDBY`).
- `BR-DISPATCH-04`: Transaction & Pessimistic write lock đảm bảo tính Atomic cho sự kiện `sos:claim` của đội cứu hộ bấm trước.
- `BR-DISPATCH-05`: Timer hết hạn tự động gán cưỡng bức (Force-assign) cho đội có điểm tốt nhất.

---

## 4. Entities / Bảng bị ảnh hưởng

**Đọc:**
- `RescueTeamEntity` (Lọc các đội khả dụng qua `findAvailableTeamsInRadius`).
- `SosRequestEntity` (Kiểm tra trạng thái SOS lúc claim).

**Ghi:**
- `SosRequestEntity` (Gán `assignedTeamId`, đổi status thành `DISPATCHED`).
- `RescueTeamEntity` (Tăng `activeCasesCount`, đổi status thành `DISPATCHED` hoặc `BUSY`).

---

## 5. Permissions cần thiết
- `sos:dispatch:auto` (Kích hoạt điều phối tự động)
- `rescue:team:manage:own` (Đội trưởng tự nhận ca cho đội của mình)

---

## 6. Thứ tự implement

- [ ] Cấu hình Module — Đăng ký `EventEmitterModule` tại `be/src/app.module.ts`.
- [ ] Phát sự kiện khi tạo SOS — Cập nhật `SosRequestService.create()` để phát sự kiện `sos.created`.
- [ ] Tạo Listener ngầm — Tạo mới `SosDispatchListener` lắng nghe sự kiện để chạy luồng Hybrid Dispatch (tìm Top 3, gửi socket `sos:offer`, setup timeout đếm ngược 30s).
- [ ] Đấu nối WebSocket Gateway — Cập nhật `DispatchGateway` lắng nghe `sos:claim`, gọi xử lý transaction nhận việc và phát `sos:offer-claimed`.
- [ ] Cập nhật Simulator — Chỉnh sửa `sos_simulator.html` hiển thị hộp cảnh báo đếm ngược 30s kèm nút nhận và emit event `sos:claim`.
- [ ] Changelog — Ghi chép nhật ký chỉnh sửa vào `be/openspec/changes/`.

---

## 7. Edge Cases / Lưu ý đặc biệt
- **Nhiều đội tranh chấp (Race Condition):** Phải xử lý tốt ngoại lệ ném ra khi đội thứ hai bấm nút nhận (nhiệm vụ đã được gán hoặc trạng thái SOS không còn là `PENDING`).
- **Mất kết nối mạng:** Nếu socket mất kết nối hoặc client reload giữa lúc đếm ngược, timer vẫn chạy ngầm trên server và tự động kích hoạt Force-Assign sau 30 giây.
