# Feature: Dashboard Overview & Statistics Module

## 1. Nghiệp vụ
> Cung cấp thông tin tổng quan, biểu đồ thời gian thực, cảnh báo thiên tai, tiến độ cứu hộ và tình hình vật tư/đóng góp nhằm phục vụ công tác điều phối cứu nạn.
> Tham chiếu các nguyên tắc bảo mật và giới hạn phạm vi quản lý theo tỉnh thành (Province Scope) trong PROJECT_RULES.md.

---

## 2. Tổng quan nghiệp vụ

Hệ thống cung cấp một bảng điều khiển (Dashboard) tổng hợp thông tin từ nhiều thực thể khác nhau:
- **Thống kê tổng quan (Stats)**: Số hộ dân, số đội cứu hộ, số SOS đang hoạt động, số thiên tai đang diễn ra, tổng số tiền đóng góp.
- **Biểu đồ thời gian thực (Charts)**: Xu hướng SOS nhận được theo ngày (tổng số, đã xử lý, chưa xử lý) và tỷ lệ kết quả cứu hộ.
- **Cảnh báo & SOS mới nhất (Alerts)**: Danh sách tin bão lũ/thiên tai khẩn cấp và các cuộc gọi SOS mới nhận chưa xử lý.
- **Bản đồ điều phối (Map & Tasks)**: Toàn bộ vị trí các đội cứu hộ, yêu cầu SOS và danh sách các nhiệm vụ đang được thực thi.
- **Vật tư & Tài chính (Resources)**: Báo cáo kho hàng cứu trợ hiện tại (số lượng thực tế so với mục tiêu) và biểu đồ dòng tiền đóng góp.

---

## 3. API Contract

### 3.1 Lấy chỉ số tổng quan (Top Cards)
```
GET /api/v1/dashboard/stats
```

**Query Parameters:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| `provinceId` | number | Optional - Lọc theo tỉnh thành |

**Response DTO (200):**
```typescript
{
  statusCode: 200,
  message: "OK",
  data: {
    totalHouseholds: {
      value: number;
      trend: number; // Tỷ lệ tăng/giảm % so với kỳ trước
      sparkline: number[]; // Dữ liệu 7 ngày qua
    },
    activeRescueTeams: {
      value: number;
      trend: number;
      sparkline: number[];
    },
    activeSosRequests: {
      value: number;
      trend: number;
      sparkline: number[];
    },
    ongoingDisasters: {
      value: number;
      trend: number;
      sparkline: number[];
    },
    totalDonations: {
      value: number;
      trend: number;
      sparkline: number[];
    }
  }
}
```

---

### 3.2 Lấy dữ liệu biểu đồ xu hướng (Charts)
```
GET /api/v1/dashboard/charts
```

**Query Parameters:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| `provinceId` | number | Optional - Lọc theo tỉnh thành |
| `days` | number | Số ngày thống kê (default: 7) |

**Response DTO (200):**
```typescript
{
  statusCode: 200,
  message: "OK",
  data: {
    sosOverTime: Array<{
      date: string; // Định dạng DD/MM
      total: number;
      resolved: number;
      pending: number;
    }>,
    rescueOutcomes: {
      total: number;
      saved: number;
      ongoing: number;
      failed: number;
    }
  }
}
```

---

### 3.3 Lấy thông báo khẩn cấp & danh sách SOS mới (Alerts)
```
GET /api/v1/dashboard/alerts
```

**Query Parameters:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| `provinceId` | number | Optional - Lọc theo tỉnh thành |

**Response DTO (200):**
```typescript
{
  statusCode: 200,
  message: "OK",
  data: {
    disasters: Array<{
      id: number;
      title: string;
      badge: string; // "CẢNH BÁO", "KHẨN CẤP"
      badgeColor: string;
      desc: string;
      time: string; // Khoảng thời gian tương đối ví dụ: "1 giờ trước"
      statusDot: string; // Màu đỏ/vàng/xanh
    }>,
    latestSos: Array<{
      id: number;
      title: string;
      address: string;
      time: string; // Định dạng HH:MM hoặc tương đối
    }>
  }
}
```

---

### 3.4 Lấy dữ liệu bản đồ & các nhiệm vụ đang làm (Map & Tasks)
```
GET /api/v1/dashboard/map-tasks
```

**Query Parameters:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| `provinceId` | number | Optional - Lọc theo tỉnh thành |

**Response DTO (200):**
```typescript
{
  statusCode: 200,
  message: "OK",
  data: {
    markers: Array<{
      id: string; // Định dạng: "sos-123" hoặc "team-45"
      type: "sos" | "team";
      lat: number;
      lng: number;
      title: string;
      severity?: string; // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" (cho SOS)
      status?: string; // "AVAILABLE" | "BUSY" (cho đội cứu hộ)
    }>,
    missions: Array<{
      id: number;
      name: string;
      teamName: string;
      percent: number;
      color: string; // Màu tiến độ
    }>
  }
}
```

---

### 3.5 Lấy thống kê vật tư & đóng góp tài chính (Resources)
```
GET /api/v1/dashboard/resources
```

**Query Parameters:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| `provinceId` | number | Optional - Lọc theo tỉnh thành |

**Response DTO (200):**
```typescript
{
  statusCode: 200,
  message: "OK",
  data: {
    inventory: Array<{
      name: string;
      current: number;
      target: number;
      percent: number;
      color: string;
    }>,
    donations: {
      totalAmount: number;
      trendPercent: number;
      sparkline: number[];
    }
  }
}
```

---

## 4. Business Rules áp dụng

- `BR-DB-01 (Province Scope)`: Nếu tài khoản người dùng có phân quyền bị giới hạn theo tỉnh (trong JWT payload có `provinceId`), hệ thống sẽ bỏ qua tham số `provinceId` gửi lên từ client và bắt buộc lọc theo tỉnh của tài khoản (ngoại trừ tài khoản `SYSTEM_ADMIN` có toàn quyền).
- `BR-DB-02 (Trend Calculation)`: Tỷ lệ tăng giảm (%) của kỳ này so với kỳ trước được tính bằng công thức: `((Kỳ_này - Kỳ_trước) / Kỳ_trước) * 100` (Nếu kỳ trước bằng 0, tỷ lệ là 100% nếu kỳ này > 0, ngược lại là 0%).

---

## 5. Entities / Bảng bị ảnh hưởng

**Đọc:**
- `household_profile`
- `rescue_team`
- `sos_request`
- `disaster_event`
- `donation`
- `rescue_mission`
- `inventory_resource`

**Ghi:**
- Không ghi (đọc chỉ dùng cho việc thống kê dữ liệu).

---

## 6. Permissions cần thiết

Sử dụng Permission Guard có sẵn:

| Action | Permission Code |
|--------|----------------|
| Xem Dashboard | `dashboard:read` |

---

## 7. Cấu trúc thư mục kết quả

```
be/src/modules/dashboard/
├── domain/
│   └── entities/                  # Không cần vì chỉ aggregate từ các module khác
├── application/
│   ├── interfaces/
│   │   └── dashboard.service.interface.ts
│   └── services/
│       └── dashboard.service.ts
├── presentation/
│   ├── controllers/
│   │   └── dashboard.controller.ts
│   └── dtos/
│       └── dashboard-response.dto.ts
└── dashboard.module.ts
```
