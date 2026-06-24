# Next Tasks — Disaster Rescue Management System

> **Cập nhật:** 2026-06-19

---

## 🎯 Module cần NÂNG CẤP TRƯỚC

### 1. Location Module (Nâng cao)

**Cần thêm:**
- [ ] **Reverse geocoding**: Tọa độ → địa chỉ
- [ ] **Geo-fencing**: Cảnh báo khi đội vào/vùng nguy hiểm

### 2. Rescue Team Module (Nâng cao)

**Cần thêm:**
- [ ] **Spatial tracking**: Cập nhật vị trí real-time với PostGIS Point
- [ ] **Auto-dispatch ready**: Chuẩn bị query tìm đội gần nhất
- [ ] **Statistics**: Tính toán hiệu suất (tỷ lệ cứu thành công, thời gian phản ứng)
- [ ] **Status transitions**: AVAILABLE → DISPATCHED → ON_SITE → COMPLETED

---

## 🚀 Module MỚI triển khai TIẾP THEO

### Priority 1: SOS Request Module (CORE BUSINESS)

**Endpoints/Chức năng cần thêm:**
- [ ] `GET /sos-requests/stats` — Thống kê SOS theo thời gian/khu vực
- [ ] Tính khoảng cách từ đội đến SOS location dùng PostGIS `ST_Distance` (đã có query DB, cần tích hợp/hoàn thiện full flow map)
- [ ] Ưu tiên đội có `activeCasesCount < maxCapacity`
- [ ] SOS status flow: PENDING → DISPATCHED → ON_SITE → RESOLVED hoặc CANCELLED
- [ ] WebSocket integration (gửi event real-time khi có SOS mới hoặc phân bổ đội)

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

## ✅ Checklist triển khai (Còn lại)

### Phase 3.2: SOS Request Module
- [ ] WebSocket integration

### Phase 3.3: Rescue Team Nâng cao
- [ ] Thêm statistics methods

---

### NOTE BỔ SUNG TỪ NGƯỜI DÙNG (KHÔNG PHẢI AI NOTE) 
** LƯU Ý : NẾU TASK NÀO HOÀN THÀNH THÊM (X) SAU MỤC TÔI GHI ĐỂ TÔI BIẾT NHA  

1. Hiện tại khi người dùng login , chưa biết được là User đăng nhập từ thiết bị gì