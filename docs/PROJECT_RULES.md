# HỆ THỐNG QUẢN LÝ & ĐIỀU PHỐI CỨU HỘ THIÊN TAI

> **Tài liệu tổng hợp nghiệp vụ — Project Rules v2.0**
> Cập nhật: Bổ sung Web Admin, Multi-Tenant theo Tỉnh, Quản lý Nhân lực, Thiệt hại, Quyên góp
> Phiên bản: 2.0

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc Multi-Tenant theo Tỉnh](#2-kiến-trúc-multi-tenant-theo-tỉnh)
3. [Người dùng & Phân quyền (Role v2)](#3-người-dùng--phân-quyền-role-v2)
4. [Nghiệp vụ & Quy trình chính](#4-nghiệp-vụ--quy-trình-chính)
5. [GIS Layers trên Bản đồ](#5-gis-layers-trên-bản-đồ)
6. [Kiến trúc hệ thống & Tech Stack](#6-kiến-trúc-hệ-thống--tech-stack)
7. [Thiết kế Database (v2 — đồng bộ toàn hệ thống)](#7-thiết-kế-database-v2)
8. [Web Admin Dashboard](#8-web-admin-dashboard)
9. [Quản lý Nhân lực & Đội Cứu hộ](#9-quản-lý-nhân-lực--đội-cứu-hộ)
10. [Quản lý Thiệt hại (Tử vong / Bị thương / An toàn)](#10-quản-lý-thiệt-hại)
11. [Hệ thống Báo cáo & Request từ Người dân](#11-hệ-thống-báo-cáo--request-từ-người-dân)
12. [Tính năng Quyên góp](#12-tính-năng-quyên-góp)
13. [Hệ thống Nhắn tin & Thông báo nhóm](#13-hệ-thống-nhắn-tin--thông-báo-nhóm)
14. [Thiết bị IoT — Phần cứng & Firmware](#14-thiết-bị-iot--phần-cứng--firmware)
15. [API Nguồn dữ liệu bên ngoài](#15-api-nguồn-dữ-liệu-bên-ngoài)
16. [Ràng buộc nghiệp vụ (Business Rules v2)](#16-ràng-buộc-nghiệp-vụ-business-rules-v2)
17. [Câu hỏi mở & Vấn đề cần giải quyết](#17-câu-hỏi-mở--vấn-đề-cần-giải-quyết)
18. [Hướng mở rộng & Ý tưởng tương lai](#18-hướng-mở-rộng--ý-tưởng-tương-lai)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Bối cảnh

Việt Nam là một trong những quốc gia chịu thiên tai nặng nề nhất. Vấn đề cốt lõi **không phải thiếu lực lượng cứu hộ**, mà là **thiếu hệ thống thông tin tập trung để điều phối kịp thời**.

**Thực trạng hiện tại:**

- Người dân kêu cứu qua Zalo, Facebook — thông tin rời rạc, trùng lặp
- Đội cứu hộ không biết vùng nào ưu tiên vì không có bản đồ trực quan
- Khi mưa lớn, internet quá tải hoặc mất hoàn toàn
- Người già, trẻ em không biết dùng smartphone
- Không có công cụ tích hợp điều phối theo vị trí thực tế
- **Các tỉnh phụ thuộc vào nhau** — không có hệ thống tự quản lý riêng

### 1.2 Triết lý thiết kế v2: "Chia để trị theo Tỉnh"

> Mỗi tỉnh là 1 **đơn vị độc lập** — tự quản lý cứu hộ, tự điều phối nhân lực, tự theo dõi thiệt hại.
> Cán bộ tại tỉnh hiểu địa hình hơn bất kỳ ai. Hệ thống phục vụ họ, không phải thay thế họ.

**Nguyên tắc:**

- Mỗi tỉnh có **data namespace riêng** — không lẫn lộn dữ liệu giữa các tỉnh
- Khi admin chọn tỉnh → hệ thống tự động load metadata của tỉnh đó (địa danh, vùng ngập lịch sử, đội cứu hộ, hạ tầng)
- Không có "trụ sở trung ương" quản lý hết — chỉ có **Super Admin** để giám sát toàn quốc nếu cần

### 1.3 Hệ thống gồm 3 sản phẩm tích hợp

| Sản phẩm                             | Mô tả                                                             | Đối tượng                                    |
| ------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------- |
| **Web Admin** (Next.js)              | Quản lý toàn bộ — bản đồ, nhân lực, thiệt hại, báo cáo, quyên góp | Cán bộ phường/xã, Trưởng đội, Điều phối viên |
| **Mobile App** (React Native)        | Gửi SOS, báo cáo tình hình, nhận cảnh báo                         | Người dân, Đội cứu hộ thực địa               |
| **Thiết bị IoT** (ESP32 + GPS + SIM) | Nút SOS vật lý, loa cảnh báo, SMS fallback                        | Người già, trẻ em, hộ dân vùng sâu           |

---

## 2. KIẾN TRÚC MULTI-TENANT THEO TỈNH

### 2.1 Mô hình Tenant

```
QUỐC GIA
  └── TỈNH / THÀNH PHỐ  ← Tenant (đơn vị độc lập)
        └── HUYỆN / QUẬN
              └── XÃ / PHƯỜNG
                    └── KHU PHỐ / ẤP / THÔN
```

**Cách hoạt động:**

- Người dùng đăng nhập → hệ thống nhận biết `province_id` trong JWT
- Mọi query đều tự động filter theo `province_id` → không cần admin nhớ chọn tỉnh
- Dữ liệu GIS, đội cứu hộ, SOS, thiệt hại — tất cả đều scoped theo tỉnh

### 2.2 Metadata tự động load theo Tỉnh

Khi một tỉnh được khởi tạo trong hệ thống, các dữ liệu sau tự động có sẵn:

| Loại metadata              | Nguồn                      | Mô tả                           |
| -------------------------- | -------------------------- | ------------------------------- |
| Ranh giới hành chính       | GADM / OpenStreetMap       | Polygon tỉnh, huyện, xã         |
| Điểm ngập lịch sử          | Nhập thủ công + import CSV | Tọa độ + mức ngập + lý do       |
| Điểm nước sâu thường xuyên | Nhập thủ công              | Vị trí nguy hiểm khi lũ         |
| Hạ tầng thoát nước         | Nhập thủ công              | Hố ga, cống, kênh, đê           |
| Vùng flood zone            | PostGIS polygon            | Phân vùng ngập theo tần suất    |
| Danh mục địa danh          | GADM                       | Tên xã/phường chuẩn để dropdown |
| Đội cứu hộ mặc định        | Admin tỉnh tạo             | Gán theo khu vực xã/phường      |

### 2.3 Khởi tạo Tỉnh mới (Onboarding Flow)

```
Super Admin tạo tỉnh mới
  → Nhập tên tỉnh, chọn tỉnh từ danh mục chuẩn (63 tỉnh/thành VN)
  → Hệ thống tự load: ranh giới hành chính GIS, danh sách xã/phường
  → Admin tỉnh được cấp tài khoản
  → Admin tỉnh bổ sung: đội cứu hộ, điểm ngập, hạ tầng
  → Tỉnh sẵn sàng hoạt động
```

---

## 3. NGƯỜI DÙNG & PHÂN QUYỀN (Dynamic RBAC v3)

> **Triết lý v3:** Chuyển từ RBAC cứng (hardcode role trong code) sang **Dynamic RBAC** — Admin tự tạo role, tự gán permission qua UI. Hệ thống linh hoạt tối đa, không cần sửa code khi thay đổi phân quyền.

### 3.1 Kiến trúc Dynamic RBAC

```
┌──────────────┐
│    users     │
└──────┬───────┘
       │ many-to-many
┌──────┴───────┐
│  user_roles  │  ← 1 user có thể nhiều roles, scoped theo tỉnh
└──────┬───────┘
       │
┌──────┴───────┐
│    roles     │  ← Admin tự tạo qua UI + 7 roles mặc định (seed)
└──────┬───────┘
       │ many-to-many
┌──────┴──────────┐
│role_permissions │
└──────┬──────────┘
       │
┌──────┴───────┐
│ permissions  │  ← Hệ thống định nghĩa sẵn, nhóm theo module
└──────────────┘
```

**Nguyên tắc hoạt động:**

- **Permissions** do hệ thống định nghĩa sẵn (code), đại diện cho từng hành động cụ thể
- **Roles** là nhóm permissions — Admin tự tạo/sửa/xóa qua UI
- **User** được gán 1 hoặc nhiều roles, scoped theo tỉnh
- Guard kiểm tra **permission**, không kiểm tra role name → linh hoạt tối đa
- 7 roles mặc định là **seed data**, có thể tùy chỉnh permissions (trừ SUPER_ADMIN)

### 3.2 Roles mặc định (Seed Data — 7 nhóm)

> Đây là roles được tạo sẵn khi khởi tạo hệ thống. Admin có thể **sửa permissions** của các role này (trừ SUPER_ADMIN) và **tạo thêm** role mới tùy ý.

| Role                      | Code             | Cấp | Mô tả                                         | Phạm vi         | is_system |
| ------------------------- | ---------------- | --- | --------------------------------------------- | --------------- | --------- |
| **Super Admin**           | `SUPER_ADMIN`    | 6   | Quản lý toàn quốc, tạo/xóa tỉnh               | Toàn quốc       | ✓ (khóa)  |
| **Admin Tỉnh**            | `PROVINCE_ADMIN` | 5   | Quản lý toàn tỉnh                             | 1 tỉnh          | ✓         |
| **Điều phối viên**        | `COORDINATOR`    | 4   | Trực hệ thống, điều phối tác chiến, giao task | 1 tỉnh          | ✓         |
| **Trưởng/Phó khu phố**    | `AREA_OFFICER`   | 3   | Duyệt báo cáo, xác nhận tin                   | Xã/Phường       | ✓         |
| **Trưởng đội cứu hộ**     | `TEAM_LEADER`    | 2   | Nhận nhiệm vụ, điều phối trong đội            | 1 đội           | ✓         |
| **Thành viên đội cứu hộ** | `RESCUE_MEMBER`  | 2   | Thực thi cứu hộ thực địa                      | 1 đội           | ✓         |
| **Người dân**             | `RESIDENT`       | 1   | Gửi SOS, báo cáo, xem cảnh báo                | Khu vực đăng ký | ✓         |

> **Điều phối viên (`COORDINATOR`) là role quan trọng nhất** — đây là người trực hệ thống 24/7, có quyền xem toàn bộ bản đồ real-time và kích hoạt thuật toán auto-dispatch.

### 3.3 Danh sách Permissions (nhóm theo Module)

> Hệ thống định nghĩa sẵn các permission. Mỗi permission là 1 hành động cụ thể. Admin gán permissions vào roles qua UI.

**Module: SOS**

| Code | Tên | Mô tả |
|------|-----|-------|
| `sos:create` | Gửi SOS | Tạo yêu cầu cứu hộ khẩn cấp |
| `sos:view:own` | Xem SOS của mình | Xem SOS do mình gửi |
| `sos:view:area` | Xem SOS khu vực | Xem SOS trong xã/phường phụ trách |
| `sos:view:all` | Xem tất cả SOS | Xem toàn bộ SOS trong tỉnh |
| `sos:assign:manual` | Phân công thủ công | Giao SOS cho đội cứu hộ |
| `sos:dispatch:auto` | Auto-dispatch | Kích hoạt thuật toán tự động phân công |
| `sos:resolve` | Hoàn thành SOS | Đánh dấu SOS đã xử lý xong |
| `sos:cancel` | Hủy SOS | Hủy yêu cầu SOS |

**Module: Rescue (Đội cứu hộ)**

| Code | Tên | Mô tả |
|------|-----|-------|
| `rescue:team:view` | Xem đội | Xem thông tin đội cứu hộ |
| `rescue:team:create` | Tạo đội | Tạo đội cứu hộ mới |
| `rescue:team:manage` | Quản lý đội | Sửa thông tin, thêm/xóa thành viên |
| `rescue:team:manage:own` | Quản lý đội mình | Chỉ quản lý đội mình là trưởng |
| `rescue:member:view` | Xem thành viên | Xem danh sách thành viên |
| `rescue:duty:manage` | Quản lý ca trực | Tạo/sửa ca trực |

**Module: Disaster (Thiên tai & Thiệt hại)**

| Code | Tên | Mô tả |
|------|-----|-------|
| `disaster:report:create` | Gửi báo cáo | Báo cáo tình hình ngập/lũ |
| `disaster:report:verify` | Duyệt báo cáo | Duyệt/từ chối báo cáo người dân |
| `disaster:casualty:create` | Cập nhật thiệt hại | Nhập thông tin tử vong/bị thương |
| `disaster:casualty:view` | Xem thiệt hại | Xem thông tin thiệt hại |
| `disaster:event:manage` | Quản lý sự kiện | Tạo/sửa sự kiện thiên tai |

**Module: Donation (Quyên góp)**

| Code | Tên | Mô tả |
|------|-----|-------|
| `donation:campaign:create` | Tạo chiến dịch | Tạo chiến dịch quyên góp |
| `donation:campaign:manage` | Quản lý chiến dịch | Sửa/đóng chiến dịch |
| `donation:manage` | Quản lý quyên góp | Xác nhận nhận/phân phối hàng |
| `donation:view:public` | Xem công khai | Xem bảng quyên góp (không cần login) |

**Module: Alert (Cảnh báo)**

| Code | Tên | Mô tả |
|------|-----|-------|
| `alert:broadcast` | Phát cảnh báo | Gửi cảnh báo diện rộng |
| `alert:iot:trigger` | Kích loa IoT | Kích hoạt loa cảnh báo IoT |
| `alert:weather:view` | Xem thời tiết | Xem dữ liệu cảnh báo thời tiết |

**Module: Message (Nhắn tin)**

| Code | Tên | Mô tả |
|------|-----|-------|
| `message:send:individual` | Nhắn cá nhân | Gửi tin nhắn cho 1 người |
| `message:send:team` | Nhắn đội | Gửi cho 1 đội cụ thể |
| `message:send:area` | Nhắn khu vực | Gửi cho xã/phường |
| `message:send:province` | Nhắn toàn tỉnh | Gửi cho tất cả user trong tỉnh |
| `message:send:role` | Nhắn theo role | Gửi cho nhóm role cụ thể |

**Module: Admin (Quản trị)**

| Code | Tên | Mô tả |
|------|-----|-------|
| `admin:user:create` | Tạo tài khoản | Tạo tài khoản người dùng |
| `admin:user:manage` | Quản lý tài khoản | Sửa/khóa tài khoản |
| `admin:user:view` | Xem tài khoản | Xem danh sách người dùng |
| `admin:role:create` | Tạo role | Tạo role mới |
| `admin:role:manage` | Quản lý role | Sửa/xóa role, gán permission |
| `admin:role:assign` | Gán role | Gán role cho user |
| `admin:province:create` | Tạo tỉnh | Tạo tỉnh mới (chỉ SUPER_ADMIN) |
| `admin:province:manage` | Quản lý tỉnh | Sửa thông tin tỉnh |
| `admin:audit:view` | Xem audit log | Xem nhật ký truy cập |

**Module: Map (Bản đồ)**

| Code | Tên | Mô tả |
|------|-----|-------|
| `map:view:area` | Xem bản đồ khu vực | Xem bản đồ xã/phường phụ trách |
| `map:view:province` | Xem bản đồ tỉnh | Xem toàn bộ bản đồ tỉnh |
| `map:layer:manage` | Quản lý layer | Thêm/sửa layer GIS |
| `map:infrastructure:manage` | Quản lý hạ tầng | Thêm/sửa hạ tầng thoát nước |

### 3.4 Ma trận Permission mặc định cho Seed Roles

> Đây là cấu hình mặc định khi seed. Admin có thể **thay đổi** qua UI (trừ SUPER_ADMIN).

| Permission | RESIDENT | RESCUE_MEMBER | TEAM_LEADER | AREA_OFFICER | COORDINATOR | PROVINCE_ADMIN | SUPER_ADMIN |
|------------|----------|---------------|-------------|--------------|-------------|----------------|-------------|
| `sos:create` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `sos:view:own` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `sos:view:area` | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `sos:view:all` | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| `sos:assign:manual` | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `sos:dispatch:auto` | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| `sos:resolve` | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `disaster:report:create` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `disaster:report:verify` | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| `disaster:casualty:create` | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `disaster:casualty:view` | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `rescue:team:manage:own` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `rescue:team:manage` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `rescue:team:create` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `alert:broadcast` | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| `alert:iot:trigger` | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| `donation:campaign:create` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `donation:manage` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `message:send:team` | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| `message:send:area` | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| `message:send:province` | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| `admin:user:create` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `admin:user:manage` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `admin:role:manage` | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `admin:province:create` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `map:view:area` | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `map:view:province` | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |

### 3.5 UI Quản lý Phân quyền (Web Admin)

> Admin Tỉnh / Super Admin có giao diện quản lý role & permission trực quan.

**Màn hình Quản lý Roles:**

```
┌─────────────────────────────────────────────────────────────┐
│  QUẢN LÝ ROLES                              [+ Tạo Role]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔒 Super Admin          Cấp 6 | Hệ thống | 45 permissions │
│  🔒 Admin Tỉnh           Cấp 5 | Hệ thống | 38 permissions │
│  🔒 Điều phối viên       Cấp 4 | Hệ thống | 28 permissions │
│  🔒 Trưởng khu phố       Cấp 3 | Hệ thống | 18 permissions │
│  🔒 Trưởng đội           Cấp 2 | Hệ thống | 15 permissions │
│  🔒 Thành viên đội       Cấp 2 | Hệ thống | 10 permissions │
│  🔒 Người dân            Cấp 1 | Hệ thống | 5 permissions  │
│  ─────────────────────────────────────────────────────────  │
│  ✏️  TNV Y tế             Cấp 2 | Tùy chỉnh | 12 permissions│
│  ✏️  Giám sát viên        Cấp 3 | Tùy chỉnh | 20 permissions│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Màn hình Gán Permissions cho Role:**

```
┌─────────────────────────────────────────────────────────────┐
│  ROLE: Điều phối viên                        [Lưu] [Hủy]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 Module: SOS                                              │
│  ☑ sos:create        ☑ sos:view:all      ☑ sos:resolve      │
│  ☑ sos:assign:manual ☑ sos:dispatch:auto ☐ sos:cancel       │
│                                                             │
│  📦 Module: Rescue                                           │
│  ☑ rescue:team:view  ☐ rescue:team:create ☐ rescue:team:manage│
│                                                             │
│  📦 Module: Alert                                            │
│  ☑ alert:broadcast   ☑ alert:iot:trigger  ☑ alert:weather:view│
│                                                             │
│  📦 Module: Admin                                            │
│  ☐ admin:user:create ☐ admin:role:manage  ☐ admin:province:* │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tính năng UI:**

- Tạo role mới với tên, mô tả, cấp bậc
- Checkbox toggle từng permission cho role
- "Chọn tất cả" / "Bỏ tất cả" theo module
- Gán role cho user (có thể nhiều roles)
- Gán role có thời hạn (`expires_at`)
- Xem danh sách user theo role
- Clone role (copy permissions từ role có sẵn)
- Không cho xóa/sửa permissions của role `SUPER_ADMIN`
- Không cho xóa role hệ thống (`is_system = true`), chỉ sửa permissions

### 3.3 Thông tin định danh bắt buộc khi đăng ký

> **Yêu cầu nghiệp vụ quan trọng:** Mọi người dùng trong hệ thống phải cung cấp thông tin đầy đủ và chính xác. Thông tin này dùng để xác minh danh tính, gắn kết với khu vực cư trú, và hỗ trợ điều phối cứu hộ.

**Thông tin bắt buộc cho tất cả người dùng:**

| Trường             | Bắt buộc | Mô tả                         |
| ------------------ | -------- | ----------------------------- |
| Họ và tên đầy đủ   | ✓        | Theo CCCD                     |
| Số CCCD / CMND     | ✓        | 9 hoặc 12 số, validate format |
| Ngày sinh          | ✓        | dd/mm/yyyy                    |
| Giới tính          | ✓        | Nam / Nữ / Khác               |
| Số điện thoại      | ✓        | Xác thực OTP                  |
| Email              | ✓        | Xác thực email                |
| Địa chỉ thường trú | ✓        | Số nhà, đường, tổ/ấp          |
| Tỉnh/Thành phố     | ✓        | Chọn từ danh mục chuẩn        |
| Huyện/Quận         | ✓        | Load động theo tỉnh           |
| Xã/Phường          | ✓        | Load động theo huyện          |
| Ảnh đại diện       | ✓        | Ảnh chân dung rõ mặt          |

**Thông tin bổ sung cho người dân (RESIDENT):**

| Trường                         | Bắt buộc | Mô tả                                 |
| ------------------------------ | -------- | ------------------------------------- |
| Số thành viên trong gia đình   | ✓        | Tổng số người đang sống cùng          |
| Có người già (≥65 tuổi)        | ✓        | Boolean + số lượng                    |
| Có trẻ em (≤15 tuổi)           | ✓        | Boolean + số lượng                    |
| Có phụ nữ mang thai            | Tùy chọn |                                       |
| Có người khuyết tật / bệnh nền | Tùy chọn | Mô tả ngắn                            |
| Số tầng nhà                    | ✓        | Để đánh giá mức độ nguy hiểm khi ngập |
| Tọa độ nhà (GPS)               | ✓        | Auto-detect hoặc chọn trên bản đồ     |

**Thông tin bổ sung cho đội cứu hộ (RESCUE_MEMBER / TEAM_LEADER):**

| Trường                         | Bắt buộc | Mô tả                                      |
| ------------------------------ | -------- | ------------------------------------------ |
| Đơn vị công tác                | ✓        | Dân phòng, PCCC, Quân sự, Tình nguyện      |
| Chuyên môn                     | ✓        | Y tế, Bơi lội, Cứu thương, Lái xuồng, Khác |
| Chứng chỉ / Bằng cấp liên quan | Tùy chọn | Upload ảnh                                 |
| Khu vực phụ trách              | ✓        | Gắn với đội cụ thể                         |
| Kinh nghiệm (năm)              | Tùy chọn |                                            |

---

## 4. NGHIỆP VỤ & QUY TRÌNH CHÍNH

### 4.1 Kịch bản A — Người dân gửi SOS qua App (có internet)

1. Mở App → chọn loại: Y tế / Thực phẩm / Cứu nạn / Mắc kẹt / Khác
2. Chụp ảnh hiện trường → mô tả tình huống → gửi
3. Hệ thống tự lấy GPS → gắn tọa độ → lưu DB → broadcast WebSocket
4. **Điều phối viên** nhận real-time alert trên Web Admin → xem vị trí trên bản đồ
5. Nhấn "Auto Dispatch" → thuật toán PostGIS tìm đội phù hợp → đề xuất
6. Điều phối viên xác nhận → đội cứu hộ nhận task trên mobile
7. Đội cập nhật: `ASSIGNED → IN_PROGRESS → RESOLVED`
8. Điều phối viên cập nhật thống kê thiệt hại (nếu có)

### 4.2 Kịch bản B — Điều phối viên trực hệ thống

> Đây là nghiệp vụ trọng tâm của v2 — Điều phối viên là "não bộ" của hệ thống trong thời gian thiên tai.

**Ca trực điển hình:**

1. Đăng nhập Web Admin → chọn tab "Trực chiến"
2. Xem **bản đồ real-time**: điểm SOS, vị trí đội cứu hộ, vùng ngập, cảnh báo thời tiết
3. Nhận SOS mới → đánh giá mức độ → kích "Auto Dispatch" hoặc phân công tay
4. Theo dõi tiến độ từng task trên timeline
5. Nhận báo cáo thiệt hại → cập nhật thống kê tỉnh
6. Phát cảnh báo loa IoT khi cần
7. Cuối ca → xuất báo cáo tổng kết ca trực

**Thuật toán Auto-Dispatch:**

```
Score = (Khoảng cách đến SOS × 0.5)
      + (Số task đang xử lý × 0.3)
      + (Mức độ khớp chuyên môn × 0.2)
→ Chọn đội có Score thấp nhất (ưu tiên gần + rảnh + có chuyên môn phù hợp)
```

### 4.3 Kịch bản C — Người dân báo cáo tình hình lũ lụt

Khác với SOS (cần cứu ngay), **báo cáo tình hình** là thông tin từ người dân về hiện trạng xung quanh:

1. Mở App → chọn "Báo cáo tình hình"
2. Chọn loại báo cáo: Ngập đường / Nước dâng / Cây ngã / Mất điện / Sạt lở / Ùn tắc / Khác
3. Chụp ảnh + mô tả + mức nước ước tính (cm)
4. Hệ thống lưu → hiển thị lên bản đồ cho khu vực đó xem
5. Đủ 3 báo cáo cùng khu vực → tự động nâng cấp thành cảnh báo cộng đồng
6. Điều phối viên / Area Officer xác nhận → đưa vào layer chính thức

### 4.4 Kịch bản D — Cập nhật thiệt hại thực địa

1. Đội cứu hộ tại hiện trường → mở App → tab "Cập nhật thiệt hại"
2. Nhập: Số người tử vong / Số người bị thương / Số người an toàn / Số người mất tích
3. Gắn tọa độ + ảnh + ghi chú
4. Trưởng đội xác nhận → đồng bộ lên Web Admin
5. Điều phối viên xem dashboard tổng hợp thiệt hại toàn tỉnh real-time

### 4.5 Kịch bản E — Thiết bị IoT gửi SOS (mất internet)

1. Nhấn giữ nút SOS ≥ 3 giây
2. Kiểm tra WiFi/3G → thất bại → chuyển SMS fallback
3. SIM800L gửi: `SOS|lat|lng|device_id|type|battery%`
4. Backend Webhook parse → tạo SOS Request với `source = 'IOT_SMS'`
5. Hiện trên bản đồ Admin với icon khác biệt

### 4.6 Kịch bản F — Admin phát cảnh báo loa IoT

1. Nhận tin cảnh báo từ API hoặc nhập thủ công
2. Chọn khu vực → soạn nội dung → nhấn "Phát cảnh báo"
3. Backend publish MQTT → ESP32 kích relay → phát loa
4. Đồng thời push notification toàn bộ user trong khu vực

---

## 5. GIS LAYERS TRÊN BẢN ĐỒ

### 5.1 Các Layer chính

| Layer                       | Mô tả                                        | Ai xem được   |
| --------------------------- | -------------------------------------------- | ------------- |
| **SOS & Điểm cứu hộ**       | Điểm SOS real-time, cluster theo vùng        | COORDINATOR+  |
| **Vị trí đội cứu hộ**       | Real-time GPS của từng đội                   | COORDINATOR+  |
| **Vùng ngập (Flood Zones)** | Polygon phân mức ngập theo tần suất          | Tất cả        |
| **Điểm ngập hiện tại**      | Báo cáo từ người dân xác nhận                | Tất cả        |
| **Điểm nước sâu**           | Vị trí nguy hiểm, độ sâu ước tính            | Tất cả        |
| **Thiệt hại**               | Điểm ghi nhận tử vong / bị thương / mất tích | AREA_OFFICER+ |
| **Hạ tầng thoát nước**      | Hố ga, kênh, đê, trạm bơm                    | AREA_OFFICER+ |
| **Cảnh báo thời tiết**      | Overlay mưa, triều, bão                      | Tất cả        |
| **Điểm tập kết / Shelter**  | Nơi người dân có thể đến tránh lũ            | Tất cả        |
| **Lịch sử ngập**            | Các vùng ngập theo năm, lý do                | Tất cả        |
| **Đê bao**                  | Vị trí đê, điểm vỡ lịch sử, nơi gia cố       | AREA_OFFICER+ |
| **Y tế & Lực lượng hỗ trợ** | Trạm y tế, bác sĩ, nhà thuốc                 | COORDINATOR+  |
| **Hộ dân đăng ký**          | Hộ có người dễ tổn thương                    | COORDINATOR+  |
| **Điểm quyên góp**          | Nơi tiếp nhận và phân phối hàng cứu trợ      | Tất cả        |

### 5.2 Metadata tự động load theo Tỉnh

Khi chọn tỉnh, bản đồ tự load:

- Ranh giới hành chính (tỉnh → huyện → xã)
- Điểm ngập lịch sử đã nhập sẵn
- Flood zones đã phân vùng
- Đội cứu hộ và khu vực phụ trách
- Hạ tầng thoát nước đã nhập

---

## 6. KIẾN TRÚC HỆ THỐNG & TECH STACK

### 6.1 Sơ đồ kiến trúc tổng thể v2

```
[Thiết bị IoT]     [Mobile App]      [Web Admin]
 ESP32 + NEO-6M     React Native      Next.js 14
 + SIM800L          + Expo            (App Router)
      │ MQTT              │                │
      ▼                   └────────────────┘
[MQTT Broker]              REST / WebSocket / SSE
 Mosquitto                          │
                           [Backend NestJS]
                            Clean Architecture
                            Multi-tenant Guard
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        [PostgreSQL]            [Redis]           [Cloudflare R2]
         + PostGIS               Cache              Ảnh SOS
         Multi-tenant            BullMQ             Ảnh CCCD
         by province_id          Session            Ảnh thiệt hại

[Open-Meteo] [GDACS] [NCHMF] ──→ Cron Job (30 phút)
[GADM GeoJSON] ──────────────→ Import khi khởi tạo tỉnh
```

### 6.2 Tech Stack đầy đủ v2

| Tầng                 | Công nghệ                              | Lý do chọn                                |
| -------------------- | -------------------------------------- | ----------------------------------------- |
| **Web Admin**        | Next.js 14 (App Router) + TypeScript   | SSR, file-based routing, dễ deploy Vercel |
| **Web UI**           | Tailwind CSS + shadcn/ui               | Component system chuyên nghiệp, nhanh     |
| **Bản đồ Web**       | Leaflet + react-leaflet / Mapbox GL JS | OSM miễn phí; Mapbox có offline tiles     |
| **State Management** | Zustand + React Query                  | Nhẹ, phù hợp real-time dashboard          |
| **Real-time Web**    | Socket.io Client + SSE                 | Live bản đồ, live thống kê                |
| **Backend**          | NestJS + TypeScript                    | Clean Architecture, DI, Guards            |
| **Database**         | PostgreSQL 15 + PostGIS 3              | Spatial query, multi-tenant               |
| **Cache / Queue**    | Redis + BullMQ                         | Hàng nghìn SOS đồng thời                  |
| **Real-time**        | Socket.io                              | Push bản đồ tức thì                       |
| **IoT Broker**       | Mosquitto (self-hosted)                | MQTT cho ESP32                            |
| **Mobile**           | React Native + Expo                    | Android + iOS cùng codebase               |
| **Auth**             | JWT + RBAC + province scope            | Phân quyền 7 cấp                          |
| **Storage**          | Cloudflare R2                          | Free 10GB, S3-compatible                  |
| **Deploy**           | Railway (backend) + Vercel (web)       | Free tier đủ demo                         |
| **IoT MCU**          | ESP32-WROOM-32                         | WiFi + BT, 38 GPIO                        |
| **IoT GPS**          | NEO-6M                                 | Chính xác 2–5m                            |
| **IoT SIM**          | SIM800L / A7670C                       | SMS fallback                              |

### 6.3 Clean Architecture Backend

```
src/
├── domain/
│   ├── entities/          # User, SOSRequest, RescueTeam, Casualty, Donation...
│   ├── value-objects/     # ProvinceId, Coordinate, NationalId...
│   └── repositories/      # Interface definitions
├── application/
│   ├── services/          # RescueTeamService, SosRequestService, etc.
│   ├── interfaces/        # IRescueTeamService, ISosRequestService, etc.
│   └── dtos/              # Input/Output DTOs
├── infrastructure/
│   ├── database/          # TypeORM, PostGIS repos
│   ├── redis/             # Cache, BullMQ
│   ├── mqtt/              # MQTT client
│   ├── http-clients/      # Open-Meteo, GDACS, NCHMF
│   └── storage/           # Cloudflare R2
└── presentation/
    ├── controllers/       # REST endpoints
    ├── gateways/          # WebSocket
    ├── guards/            # JWT, RBAC, Province scope
    └── decorators/        # @Roles(), @Province()
```

> **Rule bắt buộc:** Mọi controller phải có Guard `ProvinceScope` — tự động inject `province_id` từ JWT, không để developer quên filter tỉnh.

---

## 7. THIẾT KẾ DATABASE v2

> **Nguyên tắc thiết kế:**
>
> - Mọi bảng liên quan đến dữ liệu nghiệp vụ đều có cột `province_id` (multi-tenant)
> - Mọi đối tượng địa lý dùng `geometry` PostGIS, SRID 4326
> - GIST index trên tất cả cột geometry
> - B-tree index trên `status`, `created_at`, `province_id`
> - Soft delete bằng `deleted_at` — không xóa dữ liệu thực
> - Audit trail: `created_by`, `updated_by` trên các bảng quan trọng

---

### 7.1 Bảng `provinces` (Tỉnh/Thành phố)

```sql
id                UUID PRIMARY KEY
code              VARCHAR(10) UNIQUE      -- Mã tỉnh chuẩn (ví dụ: "79" = TP.HCM)
name              VARCHAR(100)            -- Tên đầy đủ
short_name        VARCHAR(50)             -- Tên viết tắt
boundary          geometry(MultiPolygon, 4326)  -- Ranh giới tỉnh
center_point      geometry(Point, 4326)   -- Tâm tỉnh (để center bản đồ khi chọn)
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMP
onboarded_at      TIMESTAMP               -- Khi nào tỉnh này được đưa vào hệ thống
metadata          JSONB                   -- Thông tin mở rộng (dân số, diện tích, v.v.)
```

### 7.2 Bảng `administrative_units` (Đơn vị hành chính)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
parent_id         UUID FK → administrative_units (self-reference)
type              ENUM (DISTRICT, COMMUNE, WARD, HAMLET)
                  -- DISTRICT = Huyện/Quận
                  -- COMMUNE  = Xã/Phường/Thị trấn
                  -- WARD     = Khu phố/Ấp/Thôn
code              VARCHAR(20)             -- Mã đơn vị hành chính chuẩn
name              VARCHAR(100)
boundary          geometry(MultiPolygon, 4326)
center_point      geometry(Point, 4326)
```

### 7.3 Bảng `users` (Người dùng — mở rộng từ v1)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces       -- Tỉnh thuộc về
admin_unit_id     UUID FK → administrative_units  -- Xã/Phường đăng ký

-- Thông tin định danh (bắt buộc)
full_name         VARCHAR(100) NOT NULL
national_id       VARCHAR(12) UNIQUE NOT NULL   -- Số CCCD/CMND (9 hoặc 12 số)
national_id_verified BOOLEAN DEFAULT false       -- Đã xác minh CCCD chưa
date_of_birth     DATE NOT NULL
gender            ENUM (MALE, FEMALE, OTHER)
phone             VARCHAR(15) UNIQUE NOT NULL
phone_verified    BOOLEAN DEFAULT false
email             VARCHAR(150) UNIQUE
email_verified    BOOLEAN DEFAULT false
avatar_url        VARCHAR                        -- Ảnh chân dung
national_id_front_url VARCHAR                   -- Ảnh mặt trước CCCD
national_id_back_url  VARCHAR                   -- Ảnh mặt sau CCCD

-- Địa chỉ
address_detail    VARCHAR(255)                   -- Số nhà, tên đường
home_location     geometry(Point, 4326)          -- Tọa độ nhà
current_location  geometry(Point, 4326)          -- Vị trí hiện tại (update realtime)

-- Phân quyền (Dynamic RBAC — xem bảng user_roles, roles, permissions)
-- KHÔNG còn cột role ENUM — role được gán qua bảng user_roles
trust_score       FLOAT DEFAULT 1.0              -- Điểm tin cậy chống spam
is_verified       BOOLEAN DEFAULT false          -- Đã xác minh danh tính
is_active         BOOLEAN DEFAULT true

-- Push notification
fcm_token         VARCHAR

-- Audit
created_at        TIMESTAMP
updated_at        TIMESTAMP
last_seen_at      TIMESTAMP
deleted_at        TIMESTAMP                      -- Soft delete
```

### 7.4 Bảng `permissions` (Quyền hạn — Dynamic RBAC)

> Hệ thống định nghĩa sẵn tất cả permissions. Admin KHÔNG tạo mới permission qua UI — chỉ gán permission có sẵn cho role.

```sql
id                UUID PRIMARY KEY
code              VARCHAR(100) UNIQUE NOT NULL    -- 'sos:create', 'sos:dispatch:auto'
name              VARCHAR(200) NOT NULL           -- 'Gửi SOS', 'Auto-dispatch'
module            VARCHAR(50) NOT NULL            -- 'sos', 'rescue', 'donation', 'admin', 'alert', 'map', 'message'
description       TEXT
is_system         BOOLEAN DEFAULT true            -- true = không cho xóa
sort_order        INTEGER DEFAULT 0               -- Thứ tự hiển thị trong UI
created_at        TIMESTAMP
```

### 7.5 Bảng `roles` (Vai trò — Dynamic RBAC)

> Admin tự tạo role mới qua UI. 7 roles mặc định là seed data (`is_system = true`).

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces (nullable)  -- null = role toàn hệ thống (SUPER_ADMIN)
code              VARCHAR(50) UNIQUE NOT NULL      -- 'COORDINATOR', 'RESIDENT', 'tnv-y-te'
name              VARCHAR(100) NOT NULL            -- 'Điều phối viên', 'TNV Y tế'
description       TEXT
level             INTEGER NOT NULL DEFAULT 1       -- Cấp bậc (1–6), dùng cho phân quyền phân cấp
is_system         BOOLEAN DEFAULT false            -- true = role mặc định, không cho xóa
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMP
updated_at        TIMESTAMP
created_by        UUID FK → users (nullable)       -- null cho seed data
```

### 7.6 Bảng `role_permissions` (Gán quyền cho vai trò)

> Many-to-many giữa roles và permissions. Admin toggle checkbox trên UI để gán/bỏ.

```sql
role_id           UUID FK → roles
permission_id     UUID FK → permissions
granted_by        UUID FK → users                  -- Ai gán permission này
granted_at        TIMESTAMP DEFAULT NOW()
PRIMARY KEY (role_id, permission_id)
```

### 7.7 Bảng `user_roles` (Gán vai trò cho người dùng)

> 1 user có thể có nhiều roles, scoped theo tỉnh. Hỗ trợ role có thời hạn.

```sql
id                UUID PRIMARY KEY
user_id           UUID FK → users
role_id           UUID FK → roles
province_id       UUID FK → provinces              -- Scope role theo tỉnh
assigned_by       UUID FK → users                  -- Ai gán role này
assigned_at       TIMESTAMP DEFAULT NOW()
expires_at        TIMESTAMP (nullable)             -- Role tạm thời (null = vĩnh viễn)
is_active         BOOLEAN DEFAULT true
revoked_at        TIMESTAMP (nullable)             -- Khi nào bị thu hồi
revoked_by        UUID FK → users (nullable)       -- Ai thu hồi

UNIQUE (user_id, role_id, province_id)             -- 1 user chỉ có 1 instance của role/tỉnh
```

### 7.8 Bảng `household_profiles` (Hồ sơ hộ gia đình)

```sql
id                UUID PRIMARY KEY
resident_id       UUID FK → users
province_id       UUID FK → provinces
admin_unit_id     UUID FK → administrative_units

-- Địa chỉ & vị trí
address_detail    VARCHAR(255)
home_location     geometry(Point, 4326)
floor_count       INTEGER                        -- Số tầng nhà

-- Thành viên
total_members     INTEGER NOT NULL
elderly_count     INTEGER DEFAULT 0              -- Người ≥65 tuổi
children_count    INTEGER DEFAULT 0              -- Trẻ ≤15 tuổi
pregnant_count    INTEGER DEFAULT 0
disabled_count    INTEGER DEFAULT 0

-- Sức khỏe
has_chronic_illness   BOOLEAN DEFAULT false
health_notes          TEXT

-- Tài sản & kinh doanh
asset_value_level     ENUM (LOW, MEDIUM, HIGH)
business_type         VARCHAR
water_usage_level     ENUM (LOW, HIGH)
production_type       VARCHAR                    -- Loại sản xuất (nếu có)

-- Môi trường xung quanh
near_manhole          BOOLEAN DEFAULT false
near_waste_site       BOOLEAN DEFAULT false
near_production       BOOLEAN DEFAULT false
near_canal            BOOLEAN DEFAULT false
env_notes             TEXT

-- Audit
created_at        TIMESTAMP
updated_at        TIMESTAMP
updated_by        UUID FK → users
```

### 7.9 Bảng `rescue_teams` (Đội cứu hộ)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
admin_unit_id     UUID FK → administrative_units   -- Khu vực phụ trách chính
name              VARCHAR(100) NOT NULL             -- Tên đội (VD: "Đội A - Phường Bình Thọ")
code              VARCHAR(20) UNIQUE                -- Mã đội
team_type         ENUM (DAN_PHONG, PCCC, QUAN_SU, TINH_NGUYEN, Y_TE, TONG_HOP)
status            ENUM (AVAILABLE, BUSY, OFF_DUTY, STANDBY)
current_location  geometry(Point, 4326)             -- Vị trí hiện tại của đội
base_location     geometry(Point, 4326)             -- Vị trí đóng quân / tập kết
coverage_area     geometry(Polygon, 4326)           -- Vùng phụ trách
max_capacity      INTEGER                           -- Số người tối đa
active_cases_count INTEGER DEFAULT 0               -- Số task đang xử lý
specializations   TEXT[]                            -- ['Y_TE', 'BOI_LOI', 'LAI_XUONG', ...]
equipment         JSONB                             -- Danh sách trang thiết bị
leader_id         UUID FK → users                  -- Trưởng đội

-- Thống kê (tích lũy)
total_missions    INTEGER DEFAULT 0                -- Tổng số nhiệm vụ đã thực hiện
total_rescued     INTEGER DEFAULT 0                -- Tổng số người đã cứu
total_hours_active INTEGER DEFAULT 0              -- Tổng giờ hoạt động

-- Audit
created_at        TIMESTAMP
updated_at        TIMESTAMP
created_by        UUID FK → users
```

### 7.10 Bảng `rescue_team_members` (Thành viên đội)

```sql
id                UUID PRIMARY KEY
team_id           UUID FK → rescue_teams
user_id           UUID FK → users
role_in_team      ENUM (LEADER, DEPUTY_LEADER, MEMBER)
joined_at         DATE
left_at           DATE                             -- NULL nếu vẫn còn trong đội
is_active         BOOLEAN DEFAULT true
specializations   TEXT[]                           -- Chuyên môn cá nhân trong đội

-- Thống kê cá nhân (tích lũy)
missions_count    INTEGER DEFAULT 0                -- Số nhiệm vụ đã tham gia
rescued_count     INTEGER DEFAULT 0               -- Số người đã cứu
hours_active      INTEGER DEFAULT 0               -- Số giờ hoạt động
```

### 7.11 Bảng `duty_logs` (Nhật ký ca trực)

```sql
id                UUID PRIMARY KEY
team_id           UUID FK → rescue_teams
user_id           UUID FK → users                 -- Người trực (coordinator hoặc trưởng đội)
province_id       UUID FK → provinces
admin_unit_id     UUID FK → administrative_units  -- Khu vực trực

duty_start        TIMESTAMP
duty_end          TIMESTAMP
status            ENUM (ACTIVE, COMPLETED, CANCELLED)

-- Tổng kết ca trực
sos_received      INTEGER DEFAULT 0               -- Số SOS nhận trong ca
sos_resolved      INTEGER DEFAULT 0               -- Số SOS giải quyết
rescued_count     INTEGER DEFAULT 0
notes             TEXT                            -- Ghi chú ca trực

created_at        TIMESTAMP
```

### 7.12 Bảng `team_achievements` (Thành tích đội)

```sql
id                UUID PRIMARY KEY
team_id           UUID FK → rescue_teams
province_id       UUID FK → provinces
title             VARCHAR(200)                    -- Tên thành tích / danh hiệu
description       TEXT
achieved_at       DATE
awarded_by        UUID FK → users                 -- Cán bộ trao thưởng
evidence_url      VARCHAR                         -- Ảnh/video bằng chứng
category          ENUM (RESCUE, MEDICAL, LOGISTICS, TRAINING, OTHER)
```

### 7.13 Bảng `sos_requests` (Yêu cầu cứu hộ)

```sql
id                INTEGER PRIMARY KEY AUTOINCREMENT
province_id       INTEGER FK → provinces
admin_unit_id     INTEGER FK → administrative_units
requester_id      INTEGER FK → users (nullable)         -- Null nếu gửi ẩn danh (Guest)
requester_name    VARCHAR(100) (nullable)               -- Tên khách hàng vãng lai
requester_phone   VARCHAR(15) (nullable)                -- SĐT khách hàng vãng lai
device_id         INTEGER FK → iot_devices (nullable)

location          geometry(Point, 4326)
request_type      ENUM (MEDICAL, FOOD, RESCUE, STUCK, OTHER)
status            ENUM (PENDING, DISPATCHED, ON_SITE, RESOLVED, CANCELLED)
severity          ENUM (LOW, MEDIUM, HIGH, CRITICAL)
image_urls        TEXT[]
description       TEXT
source            ENUM (APP, IOT_SMS, IOT_MQTT, WEB)

-- Phân công
assigned_team_id  INTEGER FK → rescue_teams (nullable)
assigned_by       INTEGER FK → users (nullable)         -- Coordinator/Admin phân công
assigned_at       TIMESTAMP
dispatch_method   ENUM (AUTO, MANUAL) (nullable)        -- Tự động hay thủ công

-- Kết quả
resolved_at       TIMESTAMP
resolved_by       INTEGER FK → users (nullable)
resolution_notes  TEXT
cluster_id        INTEGER (nullable)                    -- Nhóm SOS cùng khu vực

-- Audit
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### 7.14 Bảng `flood_reports` (Báo cáo tình hình lũ từ người dân)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
admin_unit_id     UUID FK → administrative_units
reporter_id       UUID FK → users

location          geometry(Point, 4326)
report_type       ENUM (FLOODED_ROAD, RISING_WATER, FALLEN_TREE, POWER_OUT,
                        LANDSLIDE, TRAFFIC_BLOCKED, OTHER)
water_depth_cm    INTEGER                         -- Độ sâu nước ước tính (cm)
image_urls        TEXT[]
description       TEXT
status            ENUM (PENDING, VERIFIED, DISMISSED)
verified_by       UUID FK → users
verified_at       TIMESTAMP

-- Tổng hợp cộng đồng
confirmation_count INTEGER DEFAULT 1             -- Số người xác nhận
is_community_alert BOOLEAN DEFAULT false         -- Đủ 3+ xác nhận → alert

created_at        TIMESTAMP
```

### 7.15 Bảng `casualties` (Thiệt hại về người)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
admin_unit_id     UUID FK → administrative_units
sos_request_id    UUID FK → sos_requests (nullable)    -- Liên kết với SOS nếu có
rescue_team_id    UUID FK → rescue_teams (nullable)    -- Đội ghi nhận
reporter_id       UUID FK → users                      -- Người nhập liệu

location          geometry(Point, 4326)                -- Vị trí phát hiện
incident_at       TIMESTAMP                            -- Thời điểm xảy ra

-- Phân loại thiệt hại
status            ENUM (DECEASED, INJURED, MISSING, SAFE, EVACUATED)

-- Thông tin cá nhân nạn nhân (nếu biết)
victim_name       VARCHAR(100)
victim_national_id VARCHAR(12)
victim_age        INTEGER
victim_gender     ENUM (MALE, FEMALE, OTHER, UNKNOWN)
victim_address    TEXT
victim_user_id    UUID FK → users (nullable)           -- Nếu nạn nhân có tài khoản

-- Chi tiết
injury_description TEXT                               -- Mô tả chấn thương
cause             ENUM (DROWNING, COLLAPSE, LANDSLIDE, ELECTRIC, OTHER, UNKNOWN)
hospital_transferred_to VARCHAR                       -- Chuyển đến bệnh viện nào
notes             TEXT
image_urls        TEXT[]

-- Xác nhận
is_confirmed      BOOLEAN DEFAULT false
confirmed_by      UUID FK → users
confirmed_at      TIMESTAMP

-- Audit
created_at        TIMESTAMP
updated_at        TIMESTAMP
created_by        UUID FK → users
updated_by        UUID FK → users
```

### 7.16 Bảng `disaster_events` (Sự kiện thiên tai — nhóm các thiệt hại lại)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
name              VARCHAR(200)                    -- VD: "Lũ lụt tháng 10/2024 - Bình Thuận"
event_type        ENUM (FLOOD, STORM, LANDSLIDE, TIDAL_SURGE, DROUGHT, OTHER)
started_at        TIMESTAMP
ended_at          TIMESTAMP
affected_area     geometry(MultiPolygon, 4326)    -- Vùng bị ảnh hưởng

-- Tổng kết thiệt hại (aggregate từ bảng casualties)
total_deceased    INTEGER DEFAULT 0
total_injured     INTEGER DEFAULT 0
total_missing     INTEGER DEFAULT 0
total_safe        INTEGER DEFAULT 0
total_evacuated   INTEGER DEFAULT 0

-- Thiệt hại tài sản
estimated_damage_vnd BIGINT                       -- Ước tính thiệt hại (VNĐ)
houses_damaged    INTEGER DEFAULT 0
houses_destroyed  INTEGER DEFAULT 0
crops_damage_ha   FLOAT DEFAULT 0                 -- Diện tích hoa màu bị thiệt hại

-- Quản lý
status            ENUM (ONGOING, RESOLVED, ARCHIVED)
created_by        UUID FK → users
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### 7.17 Bảng `donations` (Quyên góp)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces             -- Tỉnh nhận quyên góp
disaster_event_id UUID FK → disaster_events (nullable)  -- Gắn với sự kiện cụ thể

-- Người quyên góp
donor_name        VARCHAR(100)                    -- Tên người/tổ chức quyên góp
donor_phone       VARCHAR(15)
donor_email       VARCHAR(150)
donor_user_id     UUID FK → users (nullable)      -- Nếu người dùng có tài khoản
donor_type        ENUM (INDIVIDUAL, ORGANIZATION, ANONYMOUS)
is_anonymous      BOOLEAN DEFAULT false

-- Thông tin quyên góp
donation_type     ENUM (MONEY, GOODS, FOOD, MEDICINE, EQUIPMENT, OTHER)
amount_vnd        BIGINT                          -- Số tiền (nếu tiền mặt)
goods_description TEXT                           -- Mô tả hàng hóa (nếu là hiện vật)
goods_quantity    VARCHAR                        -- Số lượng hàng hóa
status            ENUM (PLEDGED, RECEIVED, DISTRIBUTED, CANCELLED)

-- Xác nhận nhận hàng
received_at       TIMESTAMP
received_by       UUID FK → users
receipt_image_url VARCHAR                        -- Ảnh biên nhận

-- Phân phối
distributed_at    TIMESTAMP
distributed_by    UUID FK → users
distribution_notes TEXT
distribution_image_url VARCHAR

-- Hiển thị công khai
is_public         BOOLEAN DEFAULT true            -- Cho phép hiển thị trên bảng quyên góp
message           TEXT                           -- Lời nhắn của người quyên góp

created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### 7.18 Bảng `donation_campaigns` (Chiến dịch quyên góp)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
disaster_event_id UUID FK → disaster_events (nullable)

title             VARCHAR(200)
description       TEXT
target_amount_vnd BIGINT                         -- Mục tiêu quyên góp
current_amount_vnd BIGINT DEFAULT 0              -- Đã nhận được
status            ENUM (ACTIVE, PAUSED, COMPLETED, CANCELLED)

bank_account_number VARCHAR                      -- Số tài khoản ngân hàng
bank_name           VARCHAR
bank_account_name   VARCHAR
qr_code_url         VARCHAR                      -- QR code chuyển khoản

started_at        TIMESTAMP
ended_at          TIMESTAMP
created_by        UUID FK → users
created_at        TIMESTAMP
is_public         BOOLEAN DEFAULT true
```

### 7.19 Bảng `messages` (Tin nhắn hệ thống)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
sender_id         UUID FK → users

message_type      ENUM (BROADCAST, GROUP, DIRECT, SYSTEM_ALERT)
channel           ENUM (PUSH_NOTIFICATION, IN_APP, SMS, ALL)
title             VARCHAR(200)
content           TEXT
image_url         VARCHAR

-- Đối tượng nhận (tùy message_type)
target_type       ENUM (ALL_PROVINCE, SPECIFIC_AREA, TEAM, INDIVIDUAL, ROLE)
target_id         UUID                            -- ID của area/team/user/role
target_roles      TEXT[]                          -- Nếu target_type = ROLE

-- Thống kê
sent_count        INTEGER DEFAULT 0
read_count        INTEGER DEFAULT 0

sent_at           TIMESTAMP
created_at        TIMESTAMP
```

### 7.20 Bảng `message_reads` (Đã đọc tin nhắn)

```sql
message_id        UUID FK → messages
user_id           UUID FK → users
read_at           TIMESTAMP
PRIMARY KEY (message_id, user_id)
```

### 7.21 Bảng `flood_zones` (Vùng ngập)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
admin_unit_id     UUID FK → administrative_units
name              VARCHAR(100)
boundary          geometry(Polygon, 4326)
severity_level    INTEGER (1–5)                   -- 1=hiếm, 5=rất thường xuyên
flood_frequency   ENUM (RARE, OCCASIONAL, FREQUENT, VERY_FREQUENT)
avg_depth_cm      INTEGER                         -- Độ sâu trung bình khi ngập
last_flooded_at   TIMESTAMP
flood_reason      ENUM (RAIN, TIDAL, LEVEE_BREAK, DRAIN_FAILURE, OTHER)
notes             TEXT
last_updated      TIMESTAMP
updated_by        UUID FK → users
```

### 7.22 Bảng `infrastructure_layers` (Hạ tầng)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
admin_unit_id     UUID FK → administrative_units
type              ENUM (MANHOLE, DRAIN_LINE, CANAL, LEVEE, PUMPING_STATION,
                        SHELTER, WASTE_SITE, TREE)
name              VARCHAR(100)
location          geometry(Geometry, 4326)         -- Point hoặc LineString hoặc Polygon
status            ENUM (NORMAL, DAMAGED, FLOODED, UNDER_MAINTENANCE, UNKNOWN)
last_dredged_at   TIMESTAMP
last_flooded_at   TIMESTAMP
last_maintained_at TIMESTAMP
notes             TEXT
updated_by        UUID FK → users
created_at        TIMESTAMP
```

### 7.23 Bảng `weather_alerts` (Cảnh báo thời tiết)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
source            ENUM (OPEN_METEO, OPENWEATHERMAP, GDACS, NASA, NCHMF, MANUAL)
alert_type        ENUM (HEAVY_RAIN, STORM, FLOOD, TROPICAL_DEPRESSION, TIDAL_SURGE)
area              geometry(Polygon, 4326)
severity_level    INTEGER (1–5)
issued_at         TIMESTAMP
expires_at        TIMESTAMP
raw_data          JSONB
is_triggered_iot  BOOLEAN DEFAULT false           -- Đã kích loa IoT chưa
triggered_by      UUID FK → users (nullable)      -- Ai kích (null = auto)
```

### 7.24 Bảng `iot_devices` (Thiết bị IoT)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
serial_number     VARCHAR UNIQUE
owner_id          UUID FK → users
last_location     geometry(Point, 4326)
last_seen_at      TIMESTAMP
battery_level     INTEGER (0–100)
sim_phone_number  VARCHAR
is_active         BOOLEAN
firmware_version  VARCHAR
```

### 7.25 Bảng `audit_logs` (Nhật ký truy cập dữ liệu nhạy cảm)

```sql
id                UUID PRIMARY KEY
province_id       UUID FK → provinces
user_id           UUID FK → users
action            VARCHAR(100)                    -- VD: 'VIEW_CASUALTY', 'UPDATE_DONATION'
resource_type     VARCHAR(50)                     -- VD: 'casualties', 'users'
resource_id       UUID
ip_address        VARCHAR
user_agent        VARCHAR
metadata          JSONB                           -- Thêm thông tin nếu cần
created_at        TIMESTAMP
```

---

### 7.26 Sơ đồ quan hệ chính (ERD tóm tắt)

```
provinces ──┬──→ administrative_units (tự tham chiếu theo cây)
            │
            ├──→ users
            │      ├──→ user_roles ──→ roles ──→ role_permissions ──→ permissions
            │      └──→ household_profiles
            │
            ├──→ roles (province-scoped hoặc global)
            │
            ├──→ rescue_teams
            │      ├──→ rescue_team_members → users
            │      ├──→ team_achievements
            │      └──→ duty_logs → users
            │
            ├──→ sos_requests → users, rescue_teams
            │
            ├──→ flood_reports → users
            │
            ├──→ casualties ──→ sos_requests, rescue_teams, users
            │
            ├──→ disaster_events ──→ casualties
            │
            ├──→ donations ──→ disaster_events, users
            │      └── donation_campaigns
            │
            ├──→ messages ──→ users
            │      └──→ message_reads → users
            │
            ├──→ flood_zones → administrative_units
            ├──→ infrastructure_layers → administrative_units
            ├──→ weather_alerts
            └──→ iot_devices → users
```

---

## 8. WEB ADMIN DASHBOARD

### 8.1 Tổng quan giao diện

Web Admin xây dựng bằng **Next.js 14 + shadcn/ui + Leaflet**. Giao diện chia làm 2 vùng chính:

- **Bảng điều khiển trái:** Danh sách, thống kê, quản lý
- **Bản đồ phải:** GIS real-time toàn tỉnh

### 8.2 Màn hình chọn Tỉnh (Landing)

```
┌─────────────────────────────────────────────────────┐
│            HỆ THỐNG CỨU HỘ THIÊN TAI               │
│                                                     │
│     Chọn tỉnh/thành phố để vào hệ thống:           │
│                                                     │
│  [🔍 Tìm tỉnh...]                                   │
│                                                     │
│  TP. Hồ Chí Minh    Bình Thuận    Cần Thơ          │
│  Long An            Đồng Tháp     An Giang          │
│  ...                                                │
│                                                     │
│  → Chọn tỉnh → Bản đồ tỉnh load, metadata tự đổ   │
└─────────────────────────────────────────────────────┘
```

### 8.3 Các Module Web Admin

#### Module 1: Dashboard Tổng quan

- **Thẻ thống kê real-time:**
  - Số SOS đang mở / hôm nay
  - Số đội đang hoạt động / standby
  - Thiệt hại: Tử vong / Bị thương / Mất tích / An toàn
  - Tổng quyên góp nhận được
- **Biểu đồ:** SOS theo giờ, thiệt hại theo ngày, đội cứu hộ hoạt động
- **Feed real-time:** Timeline SOS mới nhất

#### Module 2: Bản đồ Điều hành (Trực chiến)

- Bản đồ toàn tỉnh real-time
- Hiện tất cả layers theo toggle
- Click vào SOS → xem chi tiết → phân công
- Click vào đội → xem vị trí, trạng thái, nhiệm vụ hiện tại
- Nút "Phát cảnh báo" → chọn vùng → soạn nội dung → phát
- Filter: Theo khu vực, theo loại SOS, theo trạng thái

#### Module 3: Quản lý SOS & Điều phối

- Danh sách SOS (phân trang, filter)
- Thông tin chi tiết + ảnh + lịch sử xử lý
- Nút "Auto Dispatch" → hiện đề xuất đội
- Lịch sử phân công

#### Module 4: Quản lý Nhân lực

Xem mục 9

#### Module 5: Quản lý Thiệt hại

Xem mục 10

#### Module 6: Báo cáo từ Người dân

- Danh sách báo cáo chờ duyệt
- Duyệt / Từ chối / Lên bản đồ
- Xem cluster báo cáo cùng khu vực

#### Module 7: Quyên góp

Xem mục 12

#### Module 8: Nhắn tin & Thông báo

Xem mục 13

#### Module 9: Cài đặt hệ thống

- Ngưỡng cảnh báo thời tiết (configurable)
- Quản lý tài khoản người dùng trong tỉnh
- Cấu hình thiết bị IoT
- Quản lý hạ tầng GIS

---

## 9. QUẢN LÝ NHÂN LỰC & ĐỘI CỨU HỘ

### 9.1 Cấu trúc tổ chức đội

```
Tỉnh
  └── Đội cứu hộ (Rescue Team)
        ├── Trưởng đội (TEAM_LEADER)
        ├── Phó đội (DEPUTY_LEADER, optional)
        └── Thành viên (RESCUE_MEMBER) × N
```

**Mỗi đội gắn với:**

- Khu vực phụ trách (xã/phường + coverage polygon)
- Vị trí đóng quân (base_location)
- Loại đội (dân phòng, PCCC, quân sự, tình nguyện, y tế)
- Chuyên môn tổng hợp (từ chuyên môn các thành viên)
- Trang thiết bị hiện có

### 9.2 Tính năng Quản lý Đội

**Trên Web Admin (Module Nhân lực):**

| Tính năng             | Mô tả                                                          |
| --------------------- | -------------------------------------------------------------- |
| Danh sách đội         | Xem tất cả đội trong tỉnh, trạng thái real-time                |
| Chi tiết đội          | Danh sách thành viên, chuyên môn, thành tích, lịch sử nhiệm vụ |
| Vị trí real-time      | Xem vị trí GPS từng đội trên bản đồ                            |
| Phân công khu vực     | Gán đội phụ trách xã/phường cụ thể                             |
| Thêm / Xóa thành viên | Quản lý nhân sự đội                                            |
| Lịch sử nhiệm vụ      | Toàn bộ nhiệm vụ đội đã thực hiện                              |
| Thành tích            | Danh hiệu, khen thưởng của đội                                 |
| Ca trực               | Lịch trực, nhật ký ca trực                                     |

### 9.3 Truy vấn thống kê đội (ví dụ)

```sql
-- Đội nào cứu được nhiều người nhất tỉnh X trong tháng Y
SELECT rt.name, rt.code,
       COUNT(c.id) AS rescued_count,
       SUM(CASE WHEN c.status = 'DECEASED' THEN 1 ELSE 0 END) AS deceased_count
FROM rescue_teams rt
JOIN sos_requests sr ON sr.assigned_team_id = rt.id
JOIN casualties c ON c.sos_request_id = sr.id
WHERE rt.province_id = $province_id
  AND sr.resolved_at >= DATE_TRUNC('month', NOW())
GROUP BY rt.id
ORDER BY rescued_count DESC;

-- Thành viên nào đã tham gia bao nhiêu nhiệm vụ và cứu bao nhiêu người
SELECT u.full_name, rtm.missions_count, rtm.rescued_count, rtm.hours_active,
       rt.name AS team_name
FROM rescue_team_members rtm
JOIN users u ON rtm.user_id = u.id
JOIN rescue_teams rt ON rtm.team_id = rt.id
WHERE rt.province_id = $province_id
ORDER BY rtm.rescued_count DESC;
```

---

## 10. QUẢN LÝ THIỆT HẠI

### 10.1 Phân loại thiệt hại

| Trạng thái  | Mô tả      | Màu trên bản đồ |
| ----------- | ---------- | --------------- |
| `DECEASED`  | Tử vong    | ⚫ Đen          |
| `INJURED`   | Bị thương  | 🔴 Đỏ           |
| `MISSING`   | Mất tích   | 🟠 Cam          |
| `SAFE`      | Đã an toàn | 🟢 Xanh         |
| `EVACUATED` | Đã sơ tán  | 🔵 Xanh dương   |

### 10.2 Quy trình cập nhật thiệt hại

```
Đội cứu hộ tại hiện trường
  → Mở App mobile → "Cập nhật thiệt hại"
  → Nhập: Trạng thái, Thông tin nạn nhân, Tọa độ, Ảnh
  → Trưởng đội xác nhận
  → Đồng bộ lên server
  → Coordinator xem real-time trên Web Admin
  → Tổng hợp vào disaster_event nếu có
```

### 10.3 Dashboard Thiệt hại (Web Admin)

- **Bảng thống kê tổng:** Tử vong / Bị thương / Mất tích / An toàn / Sơ tán — theo tỉnh, theo huyện
- **Timeline:** Thiệt hại theo giờ/ngày
- **Bản đồ thiệt hại:** Các điểm thiệt hại phân loại màu sắc
- **Danh sách nạn nhân:** Tìm kiếm theo tên, CCCD, địa chỉ
- **Export:** Xuất báo cáo Excel/PDF

### 10.4 Liên kết thiệt hại với SOS & Đội

Mỗi bản ghi `casualties` có thể liên kết:

- `sos_request_id` → biết nạn nhân này phát sinh từ SOS nào
- `rescue_team_id` → biết đội nào ghi nhận / cứu được
- `disaster_event_id` → tổng hợp vào sự kiện thiên tai lớn

---

## 11. HỆ THỐNG BÁO CÁO & REQUEST TỪ NGƯỜI DÂN

### 11.1 Các loại request người dân có thể gửi

| Loại                       | Mô tả                                | Ưu tiên  |
| -------------------------- | ------------------------------------ | -------- |
| **SOS — Cần cứu hộ ngay**  | Khẩn cấp, cần đội đến ngay           | CRITICAL |
| **Báo cáo tình hình ngập** | Ngập đường, nước dâng                | MEDIUM   |
| **Yêu cầu thực phẩm/nước** | Thiếu lương thực, nước sạch          | HIGH     |
| **Báo cáo hạ tầng hỏng**   | Cống nghẹt, đê bị rò rỉ              | MEDIUM   |
| **Cập nhật an toàn**       | "Gia đình tôi đang an toàn"          | LOW      |
| **Yêu cầu sơ tán**         | Cần hỗ trợ di chuyển đến nơi an toàn | HIGH     |
| **Báo cáo cộng đồng**      | Thông tin chung cho khu vực          | LOW      |

### 11.2 Quy trình duyệt báo cáo

```
Người dân gửi báo cáo
  → Tự động hiện trên bản đồ với màu VÀNG (chờ duyệt)
  → Area Officer / Coordinator nhận notification
  → Xem xét → Duyệt / Từ chối / Yêu cầu bổ sung ảnh
  → Nếu duyệt → Chuyển màu XANH → Hiện chính thức trên bản đồ
  → Gửi thông báo lại cho người báo cáo
```

### 11.3 Trust Score & Anti-Spam

- Báo cáo từ tài khoản chưa xác thực → bắt buộc kèm ảnh
- 1 báo cáo = VÀNG (chờ duyệt)
- ≥3 báo cáo cùng khu vực 100m trong 5 phút → tự động ORANGE (cảnh báo cộng đồng)
- Tài khoản xác thực CCCD → báo cáo hiện ngay không cần duyệt
- Báo cáo sai >3 lần → khóa tài khoản tạm thời

---

## 12. TÍNH NĂNG QUYÊN GÓP

### 12.1 Tổng quan

Tính năng quyên góp cho phép:

- **Tỉnh mở chiến dịch quyên góp** cho từng đợt thiên tai
- **Người dân và tổ chức quyên góp** tiền mặt hoặc hiện vật
- **Admin tỉnh cập nhật** tiến độ nhận và phân phối hàng
- **Công khai minh bạch** — mọi người xem được số liệu tổng

### 12.2 Luồng quyên góp tiền mặt

```
Admin tỉnh tạo chiến dịch (donation_campaigns)
  → Nhập: Tên chiến dịch, mô tả, mục tiêu, số tài khoản, QR code
  → Hiện trên app người dân và web public
  → Người quyên góp chuyển khoản → điền form xác nhận
  → Admin xác nhận nhận tiền → cập nhật current_amount_vnd
  → Dashboard cập nhật real-time
```

### 12.3 Luồng quyên góp hiện vật

```
Người/Tổ chức đăng ký quyên góp hiện vật
  → Nhập: Loại hàng, số lượng, địa chỉ giao
  → Admin xác nhận lịch nhận hàng
  → Khi nhận: Chụp ảnh + upload → xác nhận received
  → Khi phân phối: Ghi chú + ảnh → xác nhận distributed
```

### 12.4 Bảng quyên góp công khai

Người dân có thể xem (không cần đăng nhập):

- Tổng số tiền/hàng đã nhận
- Danh sách người quyên góp (trừ anonymous)
- Tiến độ so với mục tiêu
- Ảnh phân phối hàng cứu trợ

---

## 13. HỆ THỐNG NHẮN TIN & THÔNG BÁO NHÓM

### 13.1 Các kênh thông báo

| Kênh                  | Mô tả                 | Ai dùng                      |
| --------------------- | --------------------- | ---------------------------- |
| **Push Notification** | FCM → mobile app      | Tất cả                       |
| **In-App Message**    | Hộp thư trong app     | Tất cả                       |
| **SMS**               | Qua SIM / nhà mạng    | Khẩn cấp, người không có app |
| **MQTT / Loa IoT**    | Phát thanh địa phương | Cảnh báo diện rộng           |

### 13.2 Broadcast theo nhóm

| Mục tiêu     | Mô tả                                | Ai gửi được     |
| ------------ | ------------------------------------ | --------------- |
| Toàn tỉnh    | Tất cả user trong tỉnh               | COORDINATOR+    |
| Theo khu vực | User trong xã/phường cụ thể          | AREA_OFFICER+   |
| Theo role    | Chỉ đội cứu hộ, hoặc chỉ coordinator | PROVINCE_ADMIN+ |
| Theo đội     | Gửi cho 1 đội cụ thể                 | TEAM_LEADER+    |
| Cá nhân      | 1 user cụ thể                        | COORDINATOR+    |

### 13.3 Template thông báo tự động

Hệ thống tự gửi khi:

- SOS mới → Coordinator, Area Officer khu vực đó
- Phân công xong → Trưởng đội nhận task
- Cảnh báo thời tiết vượt ngưỡng → Toàn tỉnh
- Pin IoT <20% → Admin
- Quyên góp nhận được → Người quyên góp

---

## 14. THIẾT BỊ IoT — PHẦN CỨNG & FIRMWARE

_(Giữ nguyên từ v1, bổ sung thêm)_

### 14.1 Danh sách linh kiện (~410,000 VNĐ/thiết bị)

| Linh kiện      | Model             | Giá      | Chức năng               |
| -------------- | ----------------- | -------- | ----------------------- |
| Vi điều khiển  | ESP32-WROOM-32    | ~80,000  | Xử lý chính, WiFi + BT  |
| Module GPS     | NEO-6M            | ~80,000  | Tọa độ chính xác 2–5m   |
| Module SIM     | SIM800L / A7670C  | ~50–250k | SMS + gọi điện fallback |
| Loa + Amp      | PAM8403 + Loa 4Ω  | ~35,000  | Cảnh báo âm thanh       |
| Pin            | 18650 ×2 + TP4056 | ~70,000  | 12–24h liên tục         |
| Nút SOS        | IP65 chống nước   | ~20,000  | Nhấn giữ 3s             |
| LED trạng thái | RGB LED           | ~10,000  | Xanh/Vàng/Đỏ            |
| Vỏ hộp         | IP55+             | ~45,000  | Chống nước              |

### 14.2 Cơ chế 3 tầng dự phòng kết nối

| Tầng | Điều kiện         | Phương thức    | Delay     |
| ---- | ----------------- | -------------- | --------- |
| 1    | Còn WiFi          | MQTT qua WiFi  | < 1 giây  |
| 2    | Mất WiFi, còn 3G  | MQTT qua SIM   | 1–3 giây  |
| 3    | Mất cả WiFi và 3G | SMS qua GSM 2G | 5–15 giây |

### 14.3 Business Rules IoT

- `BR-IOT-01:` Nút SOS phải giữ ≥3 giây mới gửi
- `BR-IOT-02:` LED: Xanh = bình thường, Vàng = đang gửi, Đỏ = mất kết nối
- `BR-IOT-03:` Pin <20% → gửi cảnh báo về server
- `BR-IOT-04:` Watchdog timer tự restart khi bị treo

---

## 15. API NGUỒN DỮ LIỆU BÊN NGOÀI

| Nguồn              | Tần suất       | Mục đích                     | Chi phí |
| ------------------ | -------------- | ---------------------------- | ------- |
| **Open-Meteo**     | Mỗi 1 giờ      | Dự báo mưa chi tiết          | 0 đồng  |
| **OpenWeatherMap** | Mỗi 30 phút    | Cảnh báo thời tiết khẩn      | 0 đồng  |
| **GDACS RSS**      | Mỗi 15 phút    | Thiên tai toàn cầu (LHQ)     | 0 đồng  |
| **NCHMF RSS**      | Mỗi 1 giờ      | Dự báo bão/ATNĐ VN           | 0 đồng  |
| **NASA LANCE**     | Mỗi 6 giờ      | Xác nhận lũ qua ảnh vệ tinh  | 0 đồng  |
| **GADM GeoJSON**   | 1 lần khi init | Ranh giới hành chính 63 tỉnh | 0 đồng  |

**Ngưỡng cảnh báo mưa:**

| Ngưỡng (mm/giờ) | Cấp     | Hành động                         |
| --------------- | ------- | --------------------------------- |
| ≥30             | 🟡 VÀNG | Cảnh báo, đề phòng ngập           |
| ≥70             | 🟠 CAM  | Nguy hiểm, yêu cầu xác nhận Admin |
| ≥100            | 🔴 ĐỎ   | Tự động kích loa IoT toàn tỉnh    |

---

## 16. RÀNG BUỘC NGHIỆP VỤ (BUSINESS RULES v2)

### 16.1 Rules về Định danh & Tài khoản

- `BR-USER-01:` Mọi tài khoản phải có số CCCD/CMND hợp lệ (9 hoặc 12 số). Không thể bỏ qua.
- `BR-USER-02:` Số điện thoại phải xác thực OTP trước khi tài khoản được kích hoạt.
- `BR-USER-03:` Tài khoản đội cứu hộ phải được Admin tỉnh phê duyệt thủ công — không tự đăng ký.
- `BR-USER-04:` CCCD của người dùng được lưu mã hóa AES-256 at-rest.
- `BR-USER-05:` Mỗi số CCCD chỉ được dùng cho 1 tài khoản duy nhất trên toàn hệ thống.

### 16.2 Rules về Multi-Tenant / Tỉnh

- `BR-TENANT-01:` Mọi API request phải có `province_id` trong JWT. Guard tự inject — developer không tự truyền.
- `BR-TENANT-02:` Không có endpoint nào trả về dữ liệu cross-province ngoại trừ SUPER_ADMIN.
- `BR-TENANT-03:` Khi tạo tỉnh mới, GADM boundary tự load — không cho tạo tỉnh không có boundary.
- `BR-TENANT-04:` Admin tỉnh không thể xem dữ liệu tỉnh khác.

### 16.3 Rules về SOS

- `BR-SOS-01:` SOS phải có tọa độ GPS hợp lệ. Nếu không có GPS, cho nhập địa chỉ → geocode.
- `BR-SOS-02:` Tài khoản chưa xác thực CCCD hoặc người dùng vãng lai (Guest) → bắt buộc kèm ảnh khi gửi SOS. Đối với Guest, yêu cầu bắt buộc cung cấp thêm `requesterName` và `requesterPhone`.
- `BR-SOS-03:` Cluster SOS trong bán kính 100–200m, khoảng 5 phút.
- `BR-SOS-04:` 1 SOS thường = VÀNG. Xác thực CCCD = hiện ngay. ≥3 SOS cùng cluster = ĐỎ.
- `BR-SOS-05:` Rate limit cho yêu cầu SOS gửi từ khách (Guest) để chống spam: tối đa 3 yêu cầu trong vòng 10 phút trên cùng một địa chỉ IP.
- `BR-SOS-06:` SOS RESOLVED phải lưu lịch sử đầy đủ — không xóa.
- `BR-SOS-07:` Cư dân và Khách có thể tự hủy yêu cầu SOS của chính mình (Self-cancellation) khi tình hình đã an toàn, TRỪ KHI đội cứu hộ đã tiếp cận hiện trường (trạng thái `ON_SITE`).
- `BR-SOS-08:` Khi một yêu cầu SOS bị hủy (CANCELLED) hoặc hoàn thành (RESOLVED), hệ thống phải tự động giải phóng đội cứu hộ đang được gán (giảm `activeCasesCount` của đội đi 1, và nếu số ca đang xử lý trở về 0 thì cập nhật trạng thái đội về `AVAILABLE`).
- `BR-SOS-09:` Tài khoản báo sai >3 lần → khóa tạm thời 24h.

### 16.4 Rules về Dispatch

- `BR-DISPATCH-01:` Chỉ đội trạng thái `AVAILABLE` hoặc `STANDBY` mới được phân công.
- `BR-DISPATCH-02:` Thuật toán: `Score = distance*0.5 + active_cases*0.3 + skill_mismatch*0.2`
- `BR-DISPATCH-03:` Chỉ user có permission `sos:dispatch:auto` mới được Auto Dispatch.
- `BR-DISPATCH-04:` Optimistic Locking (cột `version`) để tránh race condition.
- `BR-DISPATCH-05:` Khi phân công, ghi lại `dispatch_method` (AUTO/MANUAL) để phân tích sau.
- `BR-DISPATCH-06:` Thay đổi đội cứu hộ (Reassign): Khi thay đổi đội cứu hộ đã gán cho một yêu cầu SOS, hệ thống phải giảm số ca xử lý của đội cũ đi 1 (và cập nhật trạng thái của đội cũ về `AVAILABLE` nếu họ không còn ca nào khác và đang ở trạng thái `BUSY`), sau đó gán đội mới, tăng số ca xử lý của đội mới lên 1 và chuyển trạng thái đội mới thành `BUSY`.
- `BR-DISPATCH-07:` Tìm nhóm lân cận (Nearby Search): Hệ thống hỗ trợ tìm kiếm các yêu cầu SOS hoặc đội cứu hộ lân cận dựa trên tọa độ GPS hiện tại bằng các hàm không gian PostGIS (ST_Distance) trong bán kính chỉ định (mặc định là 5km), đồng thời tự động lọc theo `provinceId` của người dùng để tuân thủ multi-tenant.

### 16.5 Rules về Thiệt hại

- `BR-CASUALTY-01:` Mỗi bản ghi thiệt hại phải có ít nhất: trạng thái, tọa độ, người nhập.
- `BR-CASUALTY-02:` Thông tin nạn nhân là dữ liệu nhạy cảm — chỉ RESCUE_MEMBER+ xem được.
- `BR-CASUALTY-03:` Mọi thay đổi trạng thái thiệt hại phải ghi audit log.
- `BR-CASUALTY-04:` Số liệu `disaster_events` là aggregate từ `casualties` — không nhập tay.

### 16.6 Rules về Quyên góp

- `BR-DONATION-01:` Chiến dịch quyên góp chỉ PROVINCE_ADMIN mới tạo được.
- `BR-DONATION-02:` Tổng quyên góp hiển thị công khai — minh bạch 100%.
- `BR-DONATION-03:` Mọi giao dịch phải có ảnh biên nhận khi xác nhận nhận hàng/tiền.
- `BR-DONATION-04:` Không được xóa bản ghi quyên góp — chỉ cancel với lý do.

### 16.7 Rules về Cảnh báo

- `BR-ALERT-01:` Cảnh báo ĐỎ (≥100mm/giờ) → tự động kích loa IoT — không cần xác nhận.
- `BR-ALERT-02:` Cảnh báo VÀNG/CAM → cần Coordinator xác nhận trước broadcast.
- `BR-ALERT-03:` Raw data API thời tiết lưu JSONB để phân tích lịch sử.
- `BR-ALERT-04:` Ngưỡng cảnh báo phải configurable trong DB — không hardcode.

### 16.8 Rules về Dynamic RBAC

- `BR-RBAC-01:` Guard kiểm tra **permission**, không kiểm tra role name. Dùng `@RequirePermissions('sos:dispatch:auto')`.
- `BR-RBAC-02:` Permissions do hệ thống định nghĩa sẵn (code) — Admin KHÔNG tạo mới permission qua UI.
- `BR-RBAC-03:` Roles do Admin tạo/sửa qua UI. 7 roles mặc định là seed data (`is_system = true`).
- `BR-RBAC-04:` Không cho xóa role/permission hệ thống (`is_system = true`). Chỉ sửa permissions của role.
- `BR-RBAC-05:` Permissions của role `SUPER_ADMIN` không cho sửa — luôn có toàn quyền.
- `BR-RBAC-06:` 1 user có thể có nhiều roles, mỗi role scoped theo `province_id`.
- `BR-RBAC-07:` Role có thể có thời hạn (`expires_at`). Hệ thống tự revoke khi hết hạn.
- `BR-RBAC-08:` Khi check permission, gộp tất cả permissions từ mọi active roles của user.
- `BR-RBAC-09:` Admin chỉ có thể gán role có `level` ≤ level cao nhất của mình (không gán role ngang/trên mình).
- `BR-RBAC-10:` Mọi thay đổi role/permission phải ghi `audit_logs`.
- `BR-RBAC-11:` Permissions được cache trong Redis (TTL 5 phút) — clear cache khi thay đổi.

### 16.9 Rules về Bảo mật

- `BR-SEC-01:` JWT payload chứa `userId`, `provinceId`, `permissions[]` — không chứa thông tin nhạy cảm.
- `BR-SEC-02:` Không có endpoint public nào trả về thông tin cá nhân.
- `BR-SEC-03:` Mọi truy cập dữ liệu nhạy cảm → ghi `audit_logs`.
- `BR-SEC-04:` Authorization bằng NestJS Guard + `@RequirePermissions()` Decorator — không if-else trong controller.
- `BR-SEC-05:` CCCD, thông tin sức khỏe lưu mã hóa AES-256 at-rest.

### 16.10 Rules về Upload phương tiện (Media Upload)

- `BR-UPLOAD-01:` Chỉ hỗ trợ tải các tệp hình ảnh (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) và tài liệu PDF (`application/pdf`).
- `BR-UPLOAD-02:` Kích thước tối đa cho mỗi tệp tải lên là 10MB.
- `BR-UPLOAD-03:` Tệp được xử lý hoàn toàn trên bộ nhớ (In-memory) thông qua bộ nhớ đệm Multer (`memoryStorage`) để tránh lưu trữ tạm thời trên ổ đĩa cứng của máy chủ.
- `BR-UPLOAD-04:` Tên tệp tải lên Cloudflare R2 được đặt tên ngẫu nhiên chứa dấu mốc thời gian (`Date.now()`) và chuỗi ngẫu nhiên nhằm tránh xung đột ghi đè tệp: `${folder}/${Date.now()}-${randomPart}${ext}`.

---

## 17. CÂU HỎI MỞ & VẤN ĐỀ CẦN GIẢI QUYẾT

### 17.1 Về Multi-Tenant

- Khi mở rộng nhiều tỉnh, cần Super Admin dashboard riêng để xem tổng toàn quốc không?
- Tỉnh A muốn yêu cầu hỗ trợ từ Tỉnh B (đội cứu hộ cross-province) — xử lý thế nào?
- Dữ liệu hạ tầng (đê, kênh) chạy qua ranh giới tỉnh → thuộc tỉnh nào?

### 17.2 Về Định danh

- Xác minh CCCD real-time qua API của Bộ Công An có khả thi cho demo không?
- Nếu người không có CCCD (trẻ em nhỏ, người nước ngoài) → xử lý thế nào?

### 17.3 Về Dispatch & AI

- Thuật toán điều phối hiện tại đủ chưa, hay cần tích hợp routing thực (Dijkstra/A\* trên đường bộ)?
- Nếu 2 Coordinator cùng dispatch cùng lúc → race condition → Optimistic Lock có đủ không?

### 17.4 Về Quyên góp

- Hệ thống có cần tích hợp cổng thanh toán (MoMo, VNPay) để xác nhận tự động không?
- Cần kiểm toán độc lập cho số liệu quyên góp không?

### 17.5 Về Thiệt hại

- Số liệu tử vong/bị thương cần xác nhận từ cơ quan nào trước khi công bố?
- Thông tin nạn nhân tử vong có cần ẩn danh hóa trước khi lưu không?

### 17.6 Về IoT & 2G

- SIM800L có thể bị tắt 2G → kế hoạch nâng A7670C (4G) khi nào?
- LoRa dài hạn: ai quản lý gateway LoRa tại từng tỉnh?

---

## 18. HƯỚNG MỞ RỘNG & Ý TƯỞNG TƯƠNG LAI

### 18.1 Tính năng mở rộng

- **AI Heatmap dự đoán:** Lịch sử ngập 5 năm + DEM địa hình → predict điểm ngập mới
- **Digital Twin thoát nước:** Mô phỏng dòng chảy khi mưa lớn → cảnh báo điểm nghẽn
- **Gamification:** Người dân báo đúng → cộng trust score → đổi phần thưởng
- **Zalo Mini App:** Không cần cài app riêng
- **Dashboard UBND:** Báo cáo tổng hợp, thời gian phản hồi, hỗ trợ quy hoạch
- **Cross-province coordination:** Tỉnh A yêu cầu hỗ trợ từ Tỉnh B

### 18.2 Upgrade phần cứng IoT

- **Ngắn hạn:** A7670C (4G) khi 2G bị tắt
- **Dài hạn:** LoRa (5–15km, không tốn phí SMS)

### 18.3 Mở rộng quyên góp

- Tích hợp MoMo/VNPay → xác nhận tự động, không cần admin duyệt thủ công
- Báo cáo minh bạch định kỳ (hàng tuần) gửi tự động cho người quyên góp

---

## PHỤ LỤC

### A. Chi phí triển khai

**Phần cứng IoT (1 thiết bị):** ~410,000 VNĐ

**Vận hành hàng tháng (demo 1 tỉnh, ~100 user):**

| Dịch vụ                          | Chi phí               |
| -------------------------------- | --------------------- |
| Backend Railway/Render           | 0 VNĐ                 |
| Database Supabase + PostGIS      | 0 VNĐ                 |
| Redis Upstash                    | 0 VNĐ                 |
| Web Admin Vercel                 | 0 VNĐ                 |
| Bản đồ OSM/Mapbox free           | 0 VNĐ                 |
| API thời tiết Open-Meteo + GDACS | 0 VNĐ                 |
| Cloudflare R2 ảnh (10GB)         | 0 VNĐ                 |
| SIM card SMS fallback            | ~30,000 VNĐ           |
| **Tổng**                         | **~30,000 VNĐ/tháng** |

### B. Phạm vi Demo v2

- **1 tỉnh** cụ thể (ví dụ: Bình Thuận hoặc An Giang — thường xuyên lũ lụt)
- Chọn 2–3 huyện với đầy đủ dữ liệu hạ tầng
- **~100 người dùng** đồng thời
- **3–5 đội cứu hộ** demo
- **1 chiến dịch quyên góp** mẫu
- Thời gian phát triển: **7 tháng**

---

_Tài liệu v2.0 — Tổng hợp và mở rộng từ v1.0_
_Bổ sung: Web Admin, Multi-Tenant theo Tỉnh, Quản lý Nhân lực đầy đủ, Thiệt hại, Quyên góp, Nhắn tin nhóm, Định danh CCCD_
_Cập nhật: 2025_


---

## 19. QUY TAC KY THUAT & QUY TRINH PHAT TRIEN (Engineering Rules v1)

> **Day la tai lieu song.** Moi AI Assistant va developer lam viec voi du an nay deu phai tuan thu cac quy tac trong muc nay truoc khi viet bat ky dong code nao.

---

### 19.1 Kien truc thu muc (Clean Architecture - Bat buoc)

Du an ap dung **Clean Architecture**. Cau truc thu muc bat buoc trong `src/`:

```
src/
├── domain/                     # Lop 1: Loi nghiep vu (khong phu thuoc bat cu thu gi)
│   ├── entities/               # TypeScript class thuan — User, SosRequest, RescueTeam...
│   ├── value-objects/          # ProvinceId, Coordinate, NationalId, Severity...
│   └── repositories/           # Interface (Port) — ISosRepository, IUserRepository...
│
├── application/                # Lop 2: Luong nghiep vu (chua interfaces va services)
│   ├── services/               # Application Service (e.g., UserService, RescueTeamService)
│   ├── interfaces/             # Service Interface definitions (e.g., IUserService)
│   └── dtos/                   # Input/Output DTOs
│
├── infrastructure/             # Lop 3: Cong nghe ben ngoai
│   ├── database/               # Database repositories & configuration
│   ├── redis/                  # Cache, BullMQ queues
│   ├── mqtt/                   # MQTT Client cho IoT
│   ├── http-clients/           # Open-Meteo, GDACS, NCHMF
│   └── storage/                # Cloudflare R2
│
├── presentation/               # Lop 4: Giao tiep voi the gioi ben ngoai
│   ├── controllers/            # REST API Controllers (chi validate + goi service)
│   ├── gateways/               # WebSocket Gateways
│   ├── guards/                 # JwtAuthGuard, PermissionGuard, ProvinceScopeGuard
│   └── decorators/             # @RequirePermissions(), @CurrentUser(), @Province()
│
└── common/                     # Tien ich dung chung
    ├── exceptions/             # Custom exception classes
    ├── filters/                # Global exception filters
    ├── interceptors/           # Logging, transform response
    └── utils/                  # Helper functions
```

**Rule bat buoc ve dependency:**
- domain -> KHONG duoc import bat cu thu gi ngoai TypeScript thuan.
- application -> Chi duoc import tu domain. KHONG import TypeORM, NestJS decorators.
- infrastructure -> Implements cac interface cua domain. Duoc dung TypeORM, Redis, etc.
- presentation -> Chi goi xuong application (Services). KHONG chua business logic.

---

### 19.2 Quy tac dat ten file (File Naming Conventions)

| Loai file            | Pattern                          | Vi du                           |
| -------------------- | -------------------------------- | ------------------------------- |
| Service Interface    | name.service.interface.ts        | user.service.interface.ts       |
| Service Impl         | name.service.ts                  | user.service.ts                 |
| DTO                  | action-name.dto.ts               | send-sos.dto.ts                 |
| Controller           | name.controller.ts               | sos.controller.ts               |
| Repository Impl      | name.repository.ts               | user.repository.ts              |
| Guard                | name.guard.ts                    | permission.guard.ts             |
| Module               | name.module.ts                   | sos.module.ts                   |

---

### 19.3 Nguyen tac SOLID - Ap dung thuc te trong du an

#### S - Single Responsibility (Don trach nhiem)
- Service phu trach logic nghiep vu lien quan den module.
- Controller chi lam 3 viec: validate DTO -> goi Service -> return response.
- Repository chi lam 1 viec: tuong tac CSDL.

#### O - Open/Closed (Mo de mo rong, dong de sua doi)
- Thuat toan Dispatch dinh nghia qua interface IDispatchStrategy. Doi thuat toan = tao class moi, khong sua code cu.
- Notification channels (FCM, SMS, MQTT) deu implements INotificationChannel.

#### L - Liskov Substitution (Thay the Liskov)
- Moi Repository Implementation phai tra ve dung Entity type da hua trong interface.
- Khong tra ve Database raw object ra ngoai lop infrastructure.

#### I - Interface Segregation (Phan tach Interface)
- KHONG tao mot Interface Repository khong lo. Moi aggregate root co interface rieng.
- IBaseRepository chi chua CRUD co ban. Ham dac thu (PostGIS query) khai bao tai interface rieng.

#### D - Dependency Inversion (Dao nguoc phu thuoc)
- Service/Controller CHI inject Interface (Port), KHONG inject implementation truc tiep.

```typescript
// DUNG: Service inject Interface qua token
constructor(
  @Inject('IUserRepository')
  private readonly userRepo: IUserRepository,
) {}

// SAI: Service inject Repository truc tiep
constructor(private readonly userRepo: UserRepositoryImpl) {}
```

---

### 19.4 Base Repository Pattern

Du an su dung 2 tang Base Repository de tranh trung lap code:

**Tang 1 - Interface tai domain/repositories/:**
```typescript
// base.repository.interface.ts
export interface IBaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  softDelete(id: ID): Promise<void>;
}
```

**Tang 2 - Abstract class tai shared/infrastructure/persistence/:**
```typescript
// base.repository.ts
export abstract class BaseRepository<DomainEntity, OrmEntity extends ObjectLiteral>
  implements IBaseRepository<DomainEntity> {
  constructor(protected readonly repository: Repository<OrmEntity>) {}
  // Implements CRUD chung.
}
```

**Rules Base Repository:**
- BR-BASE-01: Repository Implementation ke thua BaseRepository khi co CRUD co ban.
- BR-BASE-02: Ham dac thu (PostGIS, query build dac biet...) override o subclass, khai bao o interface rieng.
- BR-BASE-03: Khong bao gio tra ve DB Model tho ra ngoai Infrastructure layer. Phai map hoac cast sang Domain Entity.

---

### 19.5 Quy trinh phat trien tinh nang (OpenSpec Workflow)

Du an su dung Spec-Driven Development voi thu muc openspec/.

**Cau truc thu muc openspec/:**
```
openspec/
├── config.yaml           # Cau hinh AI context & rules
├── specs/                # Dac ta tinh nang (TRUOC KHI code)
│   └── module/
│       └── feature.md    # Vi du: specs/sos/send-sos.md
└── changes/              # Changelog sau khi hoan thanh
    └── YYYY-MM-DD-feature.md
```

**Noi dung bat buoc cua 1 file Spec:**
```markdown
# Feature: Ten tinh nang

## Nghiep vu
(Mo ta use case, tham chieu PROJECT_RULES.md muc nao)

## API Contract
- Method + Path
- Request DTO schema
- Response DTO schema
- HTTP Status codes

## Business Rules ap dung
- BR-xxx-xx: ...

## Entities / Bang bi anh huong
- Doc: ...
- Ghi: ...

## Permissions can thiet
- permission:code

## Thu tu implement
1. Entity/ValueObject
2. Interface Repository
3. Service Interface + Service Impl + DTO
4. Repository Implementation (TypeORM)
5. Controller
6. Module Registration
7. DB Synchronize / Schema Update
```

**Thu tu phat trien bat buoc:**
```
Spec (openspec/specs/)
  -> Entity / Value Object
    -> Interface Repository (domain/repositories)
      -> Service Interface & Impl + DTO (application)
        -> Repository Impl (infrastructure/persistence)
          -> Controller (presentation/controllers)
            -> Module Registration
              -> DB Schema Verification
                -> Changelog (openspec/changes/)
```

**Rules OpenSpec:**
- BR-SPEC-01: Moi tinh nang moi PHAI co file spec trong openspec/specs/ TRUOC KHI code.
- BR-SPEC-02: AI Assistant PHAI doc spec va PROJECT_RULES.md truoc khi viet code.
- BR-SPEC-03: Spec PHAI reference dung Business Rules (BR-*) tu muc 16.
- BR-SPEC-04: Sau khi hoan thanh, ghi changelog vao openspec/changes/.
- BR-SPEC-05: Khong duoc thay doi thu tu implement. Entity truoc, Controller sau.

---

### 19.6 Quy tac Controller (Thin Controller)

```typescript
// DUNG - Controller mong, chi 3 buoc
@Post()
@RequirePermissions(Permissions.SOS_CREATE)
async sendSos(
  @Body() dto: CreateSosRequestValidationDto,
  @Request() req: any,
) {
  return this.service.create(dto, req.user);
}

// SAI - Controller beo, chua business logic
@Post()
async sendSos(@Body() dto: CreateSosRequestValidationDto) {
  const team = await this.teamRepo.findOne(...);
  if (team.status !== 'AVAILABLE') throw new Error(...);
}
```

---

### 19.7 Quy tac Database & TypeORM

- BR-DB-01: Development tu dong đồng bộ schema qua synchronize: true trong DatabaseModule.
- BR-DB-02: Moi thay doi schema phai duoc kiem tra can than khi khoi dong ung dung.
- BR-DB-03: Soft delete bat buoc - dung deleted_at, khong xoa record thuc (neu thiet ke co deletedAt).
- BR-DB-04: Moi bang nghiep vu phai co cot province_id - bat buoc cho multi-tenant.
- BR-DB-05: Khong viet raw SQL trong Service hoac Controller. Raw query chi trong Repository.
- BR-DB-06: PostGIS functions (ST_Distance, ST_Within...) chi duoc dung trong Infrastructure layer.
- BR-DB-07: GIST index bat buoc tren moi cot geometry. B-tree index tren status, province_id, created_at.

---

### 19.8 Checklist bat buoc cho AI Assistant

Khi duoc yeu cau code mot tinh nang moi, AI PHAI thuc hien theo thu tu:

1. Doc PROJECT_RULES.md - Tim muc nghiep vu lien quan, liet ke BR-* rules ap dung.
2. Kiem tra openspec/specs/ - Da co spec chua? Neu chua, tao spec truoc.
3. Xac dinh Permissions - Tu muc 3.3, xac dinh permission code can thiet.
4. Code theo thu tu Dependency - Entity -> Interface -> Use Case -> Repository -> Controller -> Module -> Migration.
5. Khong bo qua lop - Khong viet Prisma query trong Controller hay Use Case.
6. Dat ten file dung convention - Xem muc 19.2.
7. Ghi changelog - Tao file trong openspec/changes/ sau khi xong.

---

## 20. FAQ - Cau hoi thuong gap

### 20.1 Ai bam nut SOS? Co phai doi cuu ho khong?

**A:** Nguoi bam SOS **KHONG PHAI** doi cuu ho.

| Nguoi bam SOS | Vai tro |
|---------------|---------|
| **Nan nhan** | Bi ket trong lu, chay... bam SOS cuu cuu |
| **Nguoi chung kien** | Thay tai nan, bam bao co nguoi gap nan |
| **Thiet bi IoT** | Cam bien nuoc, khoi... tu dong gui SOS |

**Doi cuu ho** → Nhan lenh dieu dong → Den location cuu nguoi

Giong nhu goi 113 → canh sat den, khong phai canh sat bam 113.

### 20.2 He thong co thay the hoan toan viec dieu dong thu cong khong?

**A:** Khong. He thong ho tro, khong thay the hoan toan.

He thong co **3 che do hoat dong:**

| Mode | Khi nao dung | Ai quyet dinh |
|------|--------------|---------------|
| **Auto** | He thong hoat dong tot | AI dispatch tu dong |
| **Semi** | Goi y tu he thong + con nguoi duyet | Doi truong xac nhan |
| **Manual** | He thong loi/mang yeu | Doi truong tu chon |

**Tieu chi dispatch tu dong:**
- Chuyen mon (chua chay → doi PCCC, cap cuu → doi Y_TE)
- Vi tri (doi gan nhat duoc uu tien)
- Tinh trang (doi dang rai)

### 20.3 App cua doi truong co tinh nang gi?

**A:** App doi truong ho tro:

```
├── Danh sach thanh vien (da duoc phan chuyen mon san)
├── Trang thai: Rai / Dang ban / Dang di chuyen
├── Map hien thi vi tri that cua tung thanh vien
├── Filter nhanh: "Co chuyen mon PCCC + Dang rai"
└── Gui thong bao tu dong den thanh vien duoc chon
```

Doi truong **khong can goi dien tung nguoi** → chi can bam chon tren app → he thong gui thong bao tu dong.

### 20.4 Tai sao TIGER schema lai ton tai trong database?

**A:** TIGER (Topologically Integrated Geographic Encoding and Referencing) la bo du lieu dia ly cua **US Census Bureau**, chua du lieu hanh chinh My.

**Vo ich cho Vietnam:**
- ❌ Khong chua ranh gioi tinh/huyen/xa Vietnam
- ❌ Khong co ham geocoding cho dia chi Vietnam
- ❌ Chi su dung duoc cho My

**Giai phap cho Vietnam:**
- ✅ Dung `vietnamese-provinces-database` tu GitHub
- ✅ Generate `administrative-unit.json` voi 2742 don vi hanh chinh
- ✅ Generate `province-centers.json` voi toa do lat/lng tu OSM Nominatim

**Xoa TIGER:**
```sql
DROP SCHEMA IF EXISTS tiger CASCADE;
DROP SCHEMA IF EXISTS topology CASCADE;
```

### 20.5 Neu dien thoai het pin thi sao? Co can thay the bo dam khong?

**A:** He thong **khong thay the** bo dam/walkie-talkie.

#### 1. Thua nhan thuc te
Bo dam la cong cu lien lac tai hien truong (Field Communication).

> *"Dạ tha thay cô, chinh xac la tai hien truong luc nuoc ngap, mua bo, viec lien lac truc tiep giua cac thanh vien va doi truong 100% van phai dua vao bo dam de dam bao toc do va su an toan. Ung dung cua em khong duoc sinh ra de thay the bo dam trong luc dang boi cuu nguoi."*

#### 2. Diem yeu cua Bo dam ma App giai quyet duoc

Bo dam rat tot de noi chuyen, nhung co mot diem yeu chet nguoi: **Khong luu vet duoc du lieu va khong cho nguoi o xa nhin thay buc tranh tong quan.**

> *"Tuy nhien, bo dam co mot han che lon la Trung tam chi huy (Command Center) o tren tinh/thanh pho khong the nghe thay het hoi thoai cua tung doi o cac huyen, xa, va khong the biet chinh xac vi tri cua ho tren ban do neu ho khong tu doc toa do qua dam.Ung dung cua em giai quyet bai toan o tang quan ly vi mo: Truoc khi ra tran, hoac khi chi huy tai doanh trai (noi co nguon dien, co may tinh/ipad), nguoi quan ly su dung app de cau hinh quan so, cap nhat thiet bi hien co (bao nhieu xuong, bao nhieu ao phao). Khi co cuoc goi cuu nan, he thong dua vao du lieu nay de ra quyet dinh dieu dong Doi A hay Doi B.Nghĩa la: App giup dua ra quyet dinh dieu dong chinh xac, con Bo dam giup cac anh em thuc hien quyet dinh do tai hien truong."*

#### 3. Kich ban phoi hop "App + Bo dam" (Hybrid Workflow)

```
Buoc 1 (App): Nguoi dan gui cuu nan (co toa do GPS)
              Trung tam mo app, thay Doi 1 o gan, co du xuong
              -> Bam nut "Dieu dong"

Buoc 2 (Bo dam): Nguoi truc tong dai cahm bo dam len ho:
                 "Doi 1 nghe ro, co ca cap cuu tai toa do X,
                  di chuyen ngay"
                 Doi truong Doi 1 nghe dam, len xuong va xuat phat.

Buoc 3 (App tu dong): GPS gan tren xuong tu dong cap nhat
                     vi tri Doi 1 len ban do trung tam
                     -> Tong dai biet Doi 1 da di den dau ma
                        khong can lien tuc hoi "Doi 1 toi dau roi?"
                        lam nhieu song vo tuyen.
```

#### 4. Chen het cau tra loi voi Hoi dong

> *"Vì vậy, đồ án của em xây dựng một hệ thống quản lý và giám sát tài nguyên cứu hộ, đóng vai trò là 'bộ não' hỗ trợ hậu cần và điều phối, phối hợp nhịp nhàng với công cụ liên lạc truyền thống là bộ đàm, chứ không thay thế hoàn toàn các thiết bị cơ học tại hiện trường ạ."*

---

## 21. CHANGELOG

### 2026-06-12

#### SOS Request Module (Guest, Reassignment, Cancellation & Spatial Query)
- Hỗ trợ gửi yêu cầu SOS không cần đăng nhập (Guest), yêu cầu bắt buộc có `requesterName`, `requesterPhone` và ít nhất 1 ảnh hiện trường (`BR-SOS-02`).
- Áp dụng Rate Limit cho Guest SOS: tối đa 3 requests / 10 phút trên mỗi IP (`BR-SOS-05`).
- Hỗ trợ tự hủy yêu cầu SOS (Self-cancellation) cho cư dân/guest trước khi đội cứu hộ đến hiện trường (`BR-SOS-07`).
- Cơ chế giải phóng tài nguyên: Khi hoàn thành (`RESOLVED`) hoặc hủy (`CANCELLED`) yêu cầu SOS, hệ thống tự động giảm tải cho đội cứu hộ (`activeCasesCount` giảm 1, cập nhật trạng thái về `AVAILABLE` nếu tải bằng 0) (`BR-SOS-08`).
- Bổ sung quy trình đổi đội cứu hộ (Reassign Team): tự động giảm tải cho đội cũ và tăng tải cho đội mới được gán (`BR-DISPATCH-06`).
- Tìm nhóm lân cận (Nearby Search): sử dụng PostGIS spatial query (`ST_Distance`) để tìm các SOS/đội cứu hộ xung quanh trong bán kính chỉ định (`BR-DISPATCH-07`).

#### Cloudflare R2 Media Upload Integration
- Tích hợp dịch vụ lưu trữ đám mây tương thích S3 (Cloudflare R2) để tải lên hình ảnh/tài liệu trực tiếp lên R2 từ bộ nhớ đệm (in-memory stream).
- Tạo `StorageService` và `StorageModule` đóng gói cấu hình SDK S3.
- Tạo `UploadController` cung cấp endpoint `/api/v1/upload/single` và `/api/v1/upload/multiple`.
- Viết `upload.helper.ts` tách biệt logic kiểm tra định dạng và kích thước tệp ra khỏi controller.
- Viết bộ unit test cho `UploadController` và kiểm thử tích hợp E2E đầy đủ.

### 2026-06-06

#### User Entity Serialization
- Thêm `@Exclude()` decorator cho các fields nhạy cảm trong `UserEntity`:
  - `password`
  - `passwordResetOtp`
  - `passwordResetOtpExpires`
  - `passwordResetToken`
- Thêm `ClassSerializerInterceptor` global trong `main.ts`

#### ProvinceScopeGuard (Multi-Tenant)
- Tạo `ProvinceScopeGuard` tại `src/modules/auth/infrastructure/auth/guards/province-scope.guard.ts`
- Logic:
  - `SYSTEM_ADMIN (roleId=1)` → không filter, lấy hết toàn quốc
  - Các role khác → tự động set `request['provinceScope'] = { provinceId }`
- Áp dụng cho `UserController` (`@UseGuards(JwtAuthGuard, ProvinceScopeGuard)`)
- Controller merge `provinceScope` vào filters khi query

#### User Repository Soft Delete
- Fix tất cả methods trong `user.repository.ts` (module user) đều check `deletedAt: IsNull()`:
  - `findById`, `findByPhone`, `findByEmail`, `findByNationalId`, `update`, `count`
- Fix `findByIdentifier` và `findByResetToken` trong auth repository

#### Registration Validation
- Thêm `findByNationalId` method vào auth repository interface
- Thêm check `nationalId` trong `register()` method - nếu CCCD đã tồn tại thì throw error
