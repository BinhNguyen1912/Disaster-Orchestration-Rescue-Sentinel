# Phân tích Spatial Nearest Neighbor Search
## Hệ thống Cứu hộ Thiên tai — DORS (Disaster & Rescue System)
### Góc nhìn Business Analyst + System Architect

---

## PHẦN I — PHÂN TÍCH NGHIỆP VỤ (BA Analysis)

---

### 0. Bối cảnh vấn đề

Khi xảy ra thiên tai:
- Người dân **khó gửi yêu cầu cứu hộ**
- **Khó xác định vị trí** chính xác
- **Khó điều phối** lực lượng gần nhất
- Quản lý **thiếu trực quan realtime**

---

### 1️⃣ BUSINESS PROBLEM — Vấn đề nghiệp vụ

> *BA senior không dừng lại ở "cần tìm đội gần nhất". Họ đào sâu vào từng pain point thực tế.*

Điểm đúng: *Cần tìm đội cứu hộ gần nhất theo GPS realtime.*

Nhưng **Business Pain Points thật sự** bao gồm:

| Vấn đề | Mức độ |
|--------|--------|
| Người dân mất liên lạc | 🔴 Cao |
| Không xác định được vị trí | 🔴 Rất cao |
| Điều phối chậm | 🔴 Rất cao |
| Không biết đội nào AVAILABLE | 🔴 Cao |
| Không có bản đồ trực quan | 🟠 Cao |
| Không có tracking realtime | 🟡 Trung bình |

> 💡 Đây mới là **"Business Pain Points"** — không phải technical problem.

---

### 2️⃣ BUSINESS GOAL — Mục tiêu nghiệp vụ

❌ **BA không ghi**: *"Xây API tìm đội gần nhất"*

✅ **BA ghi**:
- **Giảm thời gian điều phối cứu hộ**
- **Tăng khả năng phản ứng khẩn cấp**
- **Tự động hóa tìm kiếm đội gần nhất**

> 💡 Đây gọi là **Business Outcome** — đo được bằng số liệu thực tế (thời gian phản hồi, số SOS được giải quyết, tỉ lệ thành công).

---

### 3️⃣ STAKEHOLDERS — Ai dùng hệ thống?

> *Phần này cực quan trọng — mỗi stakeholder có flow và yêu cầu riêng biệt.*

| Stakeholder | Vai trò | Yêu cầu cốt lõi |
|------------|---------|-----------------|
| Người dân | Gửi SOS | Gửi nhanh, đơn giản nhất có thể |
| Rescue Team | Nhận nhiệm vụ | Nhận alert + navigation đến điểm SOS |
| Admin tỉnh | Điều phối | Dashboard realtime, can thiệp thủ công |
| Volunteer | Hỗ trợ | Nhận task phụ trợ |
| PCCC / Y tế | Lực lượng chuyên môn | Nhận SOS đúng loại chuyên môn |
| Chính quyền | Giám sát | Báo cáo tổng hợp, thống kê |

**Mỗi role → flow khác nhau:**

```
Người dân   →  chỉ cần SOS nhanh (1 nút bấm)
Admin       →  cần dashboard realtime + override
Rescue Team →  cần navigation + thông tin SOS chi tiết
```

> 💡 Đây là **Requirement Discovery** — phát hiện yêu cầu từ từng nhóm người dùng.

---

### 4️⃣ FUNCTIONAL vs NON-FUNCTIONAL REQUIREMENTS

> *Sinh viên thường sai nặng ở phần này — chỉ liệt kê Functional mà bỏ qua Non-functional.*

#### 📌 Functional Requirements — Hệ thống PHẢI làm gì

| # | Yêu cầu |
|---|---------|
| FR-01 | Người dân gửi SOS kèm tọa độ GPS |
| FR-02 | Hệ thống tự động tìm đội cứu hộ gần nhất |
| FR-03 | Hiển thị bản đồ trực quan |
| FR-04 | Admin có thể override dispatch thủ công |
| FR-05 | Rescue Team nhận notification khi được phân công |
| FR-06 | Tracking trạng thái SOS realtime |

#### 📌 Non-functional Requirements — Hệ thống PHẢI tốt như nào

> 🔥 **Đây là phần thường bị thiếu và cực kỳ quan trọng cho Spatial NNS.**

| Requirement | Giá trị mục tiêu | Lý do quan trọng |
|-------------|-----------------|-----------------|
| Response time | < 500ms | Dispatch realtime, không được chậm |
| GPS Accuracy | ±5m | Xác định đúng vị trí nạn nhân |
| Concurrent SOS | 100+ requests | Thiên tai → nhiều SOS cùng lúc |
| Availability | 99% uptime | Hệ thống khẩn cấp không được downtime |
| Realtime update | < 2s | Dashboard admin phải cập nhật liên tục |
| Spatial query time | < 200ms | NNS phải trả kết quả cực nhanh |

---

### 5️⃣ DOMAIN MODELING — Mô hình nghiệp vụ

> *BA senior luôn model domain TRƯỚC khi nghĩ đến database hay API.*

**Nguyên tắc vàng:**
- ❌ **Đừng nghĩ**: *table trước*
- ✅ **Hãy nghĩ**: *business objects trước*

#### Domain Entities của hệ thống:

| Entity | Ý nghĩa nghiệp vụ | Thuộc tính không gian |
|--------|------------------|----------------------|
| SOS Request | Yêu cầu cứu hộ từ nạn nhân | `location` (Point) |
| Rescue Team | Đội cứu hộ | `currentLocation` (Point), `baseLocation` (Point), `coverageArea` (Polygon) |
| User (Citizen) | Người dân | `homeLocation` (Point) |
| Flood Area | Vùng ngập lụt | `boundary` (Polygon) |
| Province | Tỉnh/thành phố | `boundary` (Polygon), `centerPoint` (Point) |
| Dispatch | Sự kiện điều phối | Kết nối SOS ↔ Rescue Team |

#### Mối quan hệ giữa các Domain Object:

```
Người dân ──gửi──► SOS Request ──trigger──► Dispatch Algorithm
                                                    │
                                           PostGIS NNS Query
                                                    │
                                            Rescue Team (nearest, AVAILABLE)
                                                    │
                                           ◄──nhận nhiệm vụ── Rescue Team
```

---

### 6️⃣ BUSINESS RULES — Linh hồn hệ thống

> *Sinh viên thường bỏ qua phần này — đây là phần cực quan trọng nhất.*

| Rule ID | Business Rule | Ý nghĩa |
|---------|--------------|---------|
| BR-01 | Chỉ đội có status = `AVAILABLE` mới nhận SOS | Không dispatch đội đang bận |
| BR-02 | SOS ưu tiên vùng nguy hiểm cao (đỏ) trước | Severity-based prioritization |
| BR-03 | Đội ngoài tỉnh **không được** dispatch | Multi-tenant: mỗi tỉnh quản lý độc lập |
| BR-04 | Team capacity phải đủ (không vượt maxCapacity) | Không overload một đội |
| BR-05 | `teamType` phải khớp với `sosRequestType` | Đúng chuyên môn (PCCC, Y tế, Tìm kiếm...) |
| BR-06 | Nếu không có đội trong bán kính → mở rộng dần | Expanding radius fallback |
| BR-07 | Nếu không tìm được đội → alert Admin ngay | Escalation rule |

> 🔥 Đây là **linh hồn hệ thống** — thuật toán NNS phải tuân thủ toàn bộ những rules này.

---

### 7️⃣ TẠI SAO CHỌN POSTGIS? — Technical Decision Based on Business Need

> *BA + Architect thinking: Mọi quyết định kỹ thuật phải xuất phát từ nhu cầu nghiệp vụ.*

❌ **Không được nói**: *"Em thấy PostGIS hay nên dùng"*

✅ **Phải nói**:

> *"Hệ thống cần xử lý dữ liệu không gian (tọa độ GPS, vùng ngập, ranh giới tỉnh) và thực hiện truy vấn theo vị trí địa lý với độ chính xác cao trong thời gian thực. PostgreSQL + PostGIS là giải pháp đã được kiểm chứng trong công nghiệp GIS, tích hợp native với TypeORM, hỗ trợ đầy đủ SRID 4326 (WGS84) phù hợp với tọa độ GPS thực tế tại Việt Nam, và cung cấp các hàm spatial như ST_Distance, ST_DWithin, ST_Within đủ để thực thi toàn bộ business rules của hệ thống mà không cần thêm external service."*

**Nguyên tắc BA**: **Technical decision phải based on business need** — không phải sở thích cá nhân.

---

### 8️⃣ TẠI SAO KHÔNG DÙNG LINEAR SCAN (Brute Force)?

> *Không phải vì O(n) — mà vì Business Impact.*

| Vấn đề kỹ thuật | Hậu quả nghiệp vụ thực tế |
|-----------------|--------------------------|
| Query chậm — O(n) không có index | → Điều phối chậm → nạn nhân chờ lâu hơn |
| Realtime fail (> 500ms) | → Ảnh hưởng trực tiếp đến tính mạng con người |
| Scale fail khi nhiều SOS đồng thời | → Hệ thống sập khi thiên tai quy mô lớn |

> 🔥 **Lý do từ chối phải là nghiệp vụ, không phải thuật toán:**
> *"Không dùng Linear Scan vì ảnh hưởng đến khả năng realtime dispatching — đây là yêu cầu sống còn của hệ thống cứu hộ khẩn cấp."*

---

### 9️⃣ FAILURE SCENARIOS — Tình huống thực tế (Senior Thinking)

> *Đây là phần quan trọng nhất mà sinh viên thường bỏ qua.*

| Tình huống | Nguy cơ | Giải pháp |
|-----------|---------|-----------|
| Không có đội AVAILABLE? | SOS không được xử lý | Expanding radius → Alert admin → Manual dispatch |
| GPS sai / không chính xác? | Dispatch đến sai vị trí | Validate tọa độ, cho phép user correct manually |
| Mất mạng (offline)? | Không gửi được SOS | Offline queue, SMS fallback |
| 100 SOS cùng lúc (thiên tai lớn)? | Server quá tải | Queue (BullMQ), rate limiting, horizontal scale |
| Đội hết pin / mất liên lạc? | Tracking sai trạng thái | Heartbeat check, auto status UNAVAILABLE sau timeout |
| PostGIS query timeout? | Dispatch fail | Circuit breaker, fallback về admin manual |

---

## PHẦN II — PHÂN TÍCH KỸ THUẬT (Technical Analysis)

### Stack hệ thống

- **Stack**: NestJS 11 + TypeORM + PostgreSQL 15 + PostGIS 3.4
- **Dữ liệu không gian**: `geometry Point SRID 4326` (WGS84)
- **Bài toán cốt lõi**: SOS từ `(lat, lng)` → tìm đội `AVAILABLE` + đúng `teamType` + cùng `provinceId` + gần nhất
- **Quy mô**: Cấp tỉnh tại Việt Nam (~10–200 rescue teams/tỉnh)
- **Yêu cầu**: < 500ms, chính xác theo mét, multi-filter

---

### Thuật toán 1: Brute Force Linear Scan

**Mô tả**: Tính khoảng cách từ điểm query tới TẤT CẢ điểm, chọn min.

**Độ phức tạp**: O(n)

**Ưu điểm**:
- Đơn giản, không cần setup
- Chính xác 100%

**Nhược điểm**:
- Không scale — quét toàn bảng mỗi query
- Không tận dụng PostGIS index
- Vi phạm Non-functional requirement < 500ms khi n tăng

**Business Impact khi dùng**: Điều phối chậm → ảnh hưởng tính mạng → không chấp nhận được.

**Kết luận**: ❌ Không dùng

---

### Thuật toán 2: R-Tree Index (GiST trong PostGIS)

**Mô tả**: Cây phân cấp chia không gian thành Minimum Bounding Rectangles (MBR) lồng nhau. Đây là **thuật toán mặc định của PostGIS**.

**Độ phức tạp**: O(log n) trung bình

**Cách hoạt động**:
```
Level 0 (Root): Toàn bộ Việt Nam
Level 1: Các vùng (Bắc / Trung / Nam)
Level 2: Từng tỉnh
Level 3: Từng huyện
Leaf:    Từng điểm rescue_team

Query → loại bỏ MBR không thể chứa kết quả → chỉ scan subset nhỏ
```

**Setup**:
```sql
CREATE INDEX idx_rescue_team_location
ON rescue_team USING GIST (current_location);
```

**KNN Query**:
```sql
ORDER BY current_location <-> ST_SetSRID(ST_Point(:lng, :lat), 4326)
LIMIT 1;
```

**Ưu điểm**:
- Native PostGIS — không cần thêm dependency
- Cực nhanh với `<->` operator
- Hỗ trợ Point, Polygon, Line

**Nhược điểm**:
- Multi-filter phức tạp có thể bypass index
- `<->` tính theo degree → cần cast `::geography` để ra mét

**Kết luận**: ⭐ **Lựa chọn chính**

---

### Thuật toán 3: KD-Tree (K-Dimensional Tree)

**Mô tả**: Cây nhị phân phân chia không gian theo từng chiều xen kẽ (x→y→x→y...).

**Độ phức tạp**: O(log n) trung bình, O(n) worst case

**Ưu điểm**:
- Nhanh cho 2D data
- Thuật toán cổ điển

**Nhược điểm**:
- **Không có native support trong PostgreSQL**
- Phải implement ở application layer (NestJS)
- Không phù hợp tọa độ hình cầu (Trái Đất)
- Rebuild tree khi data thay đổi liên tục

**Kết luận**: ❌ Không khuyến nghị — GiST làm tốt hơn

---

### Thuật toán 4: Quadtree

**Mô tả**: Phân chia không gian 2D thành 4 ô vuông đệ quy.

**Ưu điểm**:
- Dễ implement
- Tốt khi data phân bố đều

**Nhược điểm**:
- Không có native PostgreSQL support
- Dữ liệu Việt Nam phân bố không đều (tập trung TP lớn) → cây mất cân bằng
- R-Tree tốt hơn cho real-world geographic data

**Kết luận**: ❌ Không khuyến nghị

---

### Thuật toán 5: Geohash

**Mô tả**: Encode `(lat, lng)` thành chuỗi string phân cấp — các điểm gần nhau có prefix giống nhau.

**Ví dụ**:
```
TP.HCM (10.8231, 106.6297) → "w3gv"
Quận 1                      → "w3gv2"
Phường cụ thể               → "w3gv2e"
```

**Setup trong PostgreSQL**:
```sql
CREATE INDEX idx_rescue_team_geohash
ON rescue_team (ST_GeoHash(current_location, 6));
```

**Ưu điểm**:
- Tìm kiếm nhanh bằng string prefix matching
- Dễ cache, dễ shard database theo khu vực
- Dùng được với B-Tree index thông thường

**Nhược điểm**:
- **Boundary problem**: 2 điểm gần nhau nhưng khác cell → bỏ sót nếu chỉ tìm 1 cell
- Phải tìm trong 9 cells (1 trung tâm + 8 lân cận) để đảm bảo
- Không chính xác tuyệt đối bằng ST_Distance

**Kết luận**: ⚠️ Dùng bổ sung cho caching/Redis, không thay thế PostGIS

---

### Thuật toán 6: H3 — Uber Hexagonal Hierarchical Spatial Index

**Mô tả**: Chia Trái Đất thành các **ô lục giác** phân cấp (16 cấp độ). Lục giác tốt hơn hình vuông vì khoảng cách từ tâm đến các cạnh đều nhau.

**Ví dụ**:
```
Resolution 9 (~174m²/cell):
TP.HCM → hàng nghìn ô lục giác
Cell ID: "89f082838ffffff"

Tìm gần nhất = k-ring search:
k=1: 7 cells (1 trung tâm + 6 xung quanh)
k=2: 19 cells
k=3: 37 cells
```

**Ưu điểm**:
- Không có boundary problem như Geohash
- Khoảng cách đều hơn (lục giác > hình vuông)
- Dùng trong production bởi Uber, Grab, Airbnb

**Nhược điểm**:
- Cần cài thêm thư viện (`h3-js` cho Node.js)
- Phức tạp hơn Geohash
- Overkill cho quy mô cấp tỉnh

**Kết luận**: ⚠️ Hay nhưng overkill — xem xét nếu muốn demo công nghệ tiên tiến trong báo cáo

---

### Thuật toán 7: LSH — Locality Sensitive Hashing (Approximate NNS)

**Mô tả**: Hash các điểm gần nhau vào cùng bucket với xác suất cao — tìm kiếm **gần đúng** (approximate).

**Ưu điểm**:
- Cực nhanh với dataset rất lớn (triệu điểm)
- Phù hợp vector embedding, image search

**Nhược điểm**:
- **Approximate** — không đảm bảo 100% chính xác
- Có thể bỏ sót đội gần nhất (false negative)
- **Không phù hợp hệ thống cứu hộ** — sai lầm ảnh hưởng tính mạng

**Business Impact**: Vi phạm trực tiếp yêu cầu "chính xác tuyệt đối" của hệ thống khẩn cấp.

**Kết luận**: ❌ **KHÔNG dùng** — hệ thống cứu hộ không chấp nhận approximate

---

### Thuật toán 8: Expanding Radius Search (Progressive NNS)

**Mô tả**: Chiến lược query — bắt đầu bán kính nhỏ, mở rộng dần nếu không tìm thấy kết quả.

**Cách hoạt động**:
```
radius = 5km
WHILE true:
    results = ST_DWithin(sos_location, team_location, radius)
              + WHERE status = AVAILABLE
              + AND teamType = :type
              + AND provinceId = :provinceId

    IF results not empty → RETURN nearest team
    IF radius > max_radius (e.g. 50km) → ALERT admin
    ELSE radius = radius × 2  (5 → 10 → 20 → 40km)
```

**Ưu điểm**:
- Tuân thủ Business Rule BR-06 và BR-07
- Không dispatch đội quá xa không cần thiết
- Nghiệp vụ rõ ràng, dễ giải thích trong báo cáo

**Nhược điểm**:
- Nhiều query khi khan hiếm đội
- Phải định nghĩa ngưỡng bán kính tối đa hợp lý

**Kết luận**: ⭐ **Kết hợp bắt buộc** với R-Tree GiST

---

## PHẦN III — SO SÁNH TỔNG HỢP

| Thuật toán | Độ phức tạp | Chính xác | PostGIS Native | Phù hợp hệ thống |
|---|---|---|---|---|
| Brute Force | O(n) | 100% | ✅ | ❌ Quá chậm |
| **R-Tree / GiST** | **O(log n)** | **100%** | **✅ Sẵn có** | **⭐ Chính** |
| KD-Tree | O(log n) avg | 100% | ❌ Tự code | ❌ Không cần |
| Quadtree | O(log n) | 100% | ❌ Tự code | ❌ Không cần |
| Geohash | O(1) lookup | ~95% | ✅ ST_GeoHash | ⚠️ Phụ trợ |
| H3 Hexagonal | O(1) lookup | ~98% | ❌ Extension | ⚠️ Tùy chọn |
| LSH | O(1) | ~80–90% | ❌ | ❌ Không chấp nhận |
| **Expanding Radius** | O(log n × k) | **100%** | **✅ Dùng GiST** | **⭐ Kết hợp** |

---

## PHẦN IV — GIẢI PHÁP ĐỀ XUẤT

### Lựa chọn: R-Tree (GiST) + Expanding Radius

**Lý do kỹ thuật**:
- GiST index native PostGIS — không thêm dependency
- `ST_DWithin` filter bán kính + `<->` sort nhanh — tối ưu cả tốc độ lẫn độ chính xác
- Expanding radius đảm bảo tuân thủ Business Rules BR-06, BR-07

**Query mẫu**:
```sql
SELECT id, name,
  ST_Distance(
    current_location::geography,
    ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography
  ) AS distance_meters
FROM rescue_team
WHERE status = 'AVAILABLE'
  AND team_type = :teamType
  AND province_id = :provinceId
  AND ST_DWithin(
    current_location::geography,
    ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography,
    :radius_meters  -- 5000 → 10000 → 20000
  )
ORDER BY current_location <-> ST_SetSRID(ST_Point(:lng, :lat), 4326)
LIMIT 1;
```

**Index cần tạo**:
```sql
CREATE INDEX idx_rescue_team_current_location
ON rescue_team USING GIST (current_location);

CREATE INDEX idx_sos_request_location
ON sos_request USING GIST (location);
```

### Luồng dispatch hoàn chỉnh:

```
SOS gửi lên (lat, lng, type, severity)
        │
        ▼
Validate tọa độ GPS hợp lệ?
        │ YES
        ▼
Tìm trong 5km (GiST + ST_DWithin) ──► có đội? → Dispatch ✅
        │ NO
        ▼
Tìm trong 10km ──► có đội? → Dispatch ✅
        │ NO
        ▼
Tìm trong 20km ──► có đội? → Dispatch ✅
        │ NO
        ▼
Alert Admin 🚨 → Manual Dispatch
```

---

## PHẦN V — TỪ KHÓA HỌC THUẬT

| Keyword | Ý nghĩa | Dùng ở đâu trong báo cáo |
|---------|---------|--------------------------|
| GIS | Geographic Information System — bản đồ số | Abstract, giới thiệu hệ thống |
| Spatial Query | Truy vấn dữ liệu theo vị trí GPS | Phần kỹ thuật |
| Nearest Neighbor Search (NNS) | Tìm điểm gần nhất | Phần thuật toán |
| KNN (K-Nearest Neighbor) | Tìm K điểm gần nhất | Phần thuật toán |
| Dispatching | Điều phối lực lượng cứu hộ | Phần nghiệp vụ |
| Spatial Matching | Ghép cặp SOS ↔ Rescue Team theo vị trí | Phần thiết kế |
| Realtime Tracking | Cập nhật vị trí theo thời gian thực | Phần tính năng |
| Geospatial System | Hệ thống xử lý dữ liệu không gian địa lý | Tên đề tài |
| PostGIS | Extension PostgreSQL cho spatial data | Phần công nghệ |
| SRID 4326 / WGS84 | Hệ tọa độ GPS toàn cầu | Phần kỹ thuật |
| GiST Index | Generalized Search Tree — index cho spatial | Phần kỹ thuật |
| Expanding Radius | Chiến lược mở rộng bán kính tìm kiếm | Phần thuật toán |

---

## PHẦN VI — ROADMAP THỰC HIỆN

> *"Đừng rush code. Hãy hoàn thiện phân tích trước."*

### Thứ tự nên làm:

| Bước | Nội dung | Output |
|------|---------|--------|
| 1️⃣ | **Problem Statement** | Mô tả vấn đề rõ ràng, pain points |
| 2️⃣ | **Business Rules** | Liệt kê đầy đủ BR-01 → BR-07 |
| 3️⃣ | **Use Cases** | UC cho từng stakeholder |
| 4️⃣ | **Dispatch Flow** | Flowchart điều phối đầy đủ |
| 5️⃣ | **Sequence Diagram** | Luồng kỹ thuật: SOS → NNS → Dispatch |
| 6️⃣ | **Spatial Architecture** | GiST index, query design, failure handling |

> 🔥 **Ưu tiên số 1**: Phân tích luồng điều phối cứu hộ (Dispatch Flow) — đây là **trái tim hệ thống**.

---

## PHẦN VII — PROMPT GỢI Ý CHO CHATGPT

> Copy toàn bộ phần dưới đây và ném vào ChatGPT để phân tích chọn thuật toán phù hợp nhất:

---

```
Hệ thống: DORS — Disaster & Rescue System (Hệ thống cứu hộ thiên tai Việt Nam)
Stack: NestJS 11 + TypeORM + PostgreSQL 15 + PostGIS 3.4
Dữ liệu không gian: geometry Point SRID 4326 (tọa độ GPS WGS84)
Địa bàn: Cấp tỉnh tại Việt Nam (~10–200 rescue teams mỗi tỉnh)

Business Rules bắt buộc:
- BR-01: Chỉ dispatch đội status = AVAILABLE
- BR-02: SOS ưu tiên vùng nguy hiểm cao (severity)
- BR-03: Chỉ trong cùng provinceId (multi-tenant, đội ngoài tỉnh không được dispatch)
- BR-04: Team capacity phải đủ (không vượt maxCapacity)
- BR-05: teamType phải khớp sosRequestType (PCCC, Y tế, Tìm kiếm...)
- BR-06: Nếu không có đội trong bán kính → expanding radius (5km → 10km → 20km)
- BR-07: Nếu không tìm được đội → alert Admin ngay

Non-functional Requirements:
- Response time < 500ms (dispatch realtime)
- GPS Accuracy: ±5m
- Concurrent SOS: 100+ requests đồng thời
- Availability: 99% uptime
- Spatial query time: < 200ms

Failure Scenarios cần xử lý:
- Không có đội AVAILABLE
- GPS sai / không chính xác
- Mất mạng (offline)
- 100 SOS cùng lúc
- Đội mất liên lạc giữa chừng
- PostGIS query timeout

Các thuật toán đang xem xét:
1. Brute Force Linear Scan — O(n), đơn giản, không scale
2. R-Tree / GiST Index — O(log n), native PostGIS, dùng <-> operator
3. KD-Tree — O(log n), cần tự implement ở application layer
4. Quadtree — O(log n), cần tự implement
5. Geohash — O(1) lookup, boundary problem, phù hợp caching
6. H3 Hexagonal (Uber) — O(1) lookup, không boundary problem, cần extension
7. LSH Approximate NNS — O(1), approximate (~80-90%), không chấp nhận sai
8. Expanding Radius Search — chiến lược query, kết hợp với GiST

Yêu cầu phân tích:
Hãy phân tích và chọn thuật toán hoặc kết hợp thuật toán phù hợp nhất cho hệ thống này,
dựa trên các tiêu chí:
1. Độ chính xác: 100% — không chấp nhận approximate (hệ thống khẩn cấp)
2. Tốc độ: < 500ms realtime dispatch
3. Tích hợp: ưu tiên native PostGIS, không muốn thêm dependency
4. Business Rules: phải tuân thủ toàn bộ BR-01 đến BR-07
5. Failure Scenarios: phải có giải pháp cho các tình huống thực tế

Hãy giải thích lý do chọn theo góc độ Business Impact (không chỉ thuần kỹ thuật).
```


//BỎ QUA DÒNG DƯỚI


Đề tài tập trung giải quyết bài toán điều phối cứu hộ dựa trên dữ liệu không gian thời gian thực trong bối cảnh thiên tai, đặc biệt là lũ lụt tại Việt Nam. Vấn đề thực tế không nằm ở việc xây dựng một ứng dụng CRUD thông thường mà nằm ở khả năng tiếp nhận tín hiệu SOS nhanh chóng, xác định vị trí GPS chính xác và tìm kiếm đội cứu hộ phù hợp gần nhất để giảm thời gian phản ứng khi xảy ra khẩn cấp. Hệ thống bao gồm hai nguồn gửi SOS chính là ứng dụng di động và thiết bị nút bấm SOS sử dụng ESP32 kết hợp GPS Neo-6M nhằm đảm bảo khả năng hoạt động ngay cả khi người dân mất điện thoại hoặc không thể thực hiện cuộc gọi thông thường. Tư duy đúng khi phân tích dự án cần bắt đầu từ Business Problem thay vì công nghệ. Cần xác định rõ các pain points như khó xác định vị trí người cần cứu hộ, điều phối lực lượng chậm, thiếu bản đồ trực quan realtime, khó quản lý đội cứu hộ và tình trạng mất kết nối trong điều kiện thiên tai. Từ đó mới xác định mục tiêu nghiệp vụ như giảm thời gian điều phối, tăng khả năng phản ứng khẩn cấp và hỗ trợ quản lý cứu hộ trực quan trên bản đồ GIS.

Trong quá trình phân tích cần phân biệt rõ Functional Requirements và Non-functional Requirements. Functional tập trung vào các chức năng như gửi SOS, hiển thị bản đồ, tìm đội cứu hộ gần nhất, quản lý đội cứu hộ và tracking vị trí. Non-functional tập trung vào hiệu năng và chất lượng hệ thống như thời gian phản hồi dưới 500ms, realtime update dưới 2 giây, GPS accuracy khoảng ±5m, khả năng xử lý nhiều SOS cùng lúc và tính sẵn sàng của hệ thống. Ngoài ra cần phân tích stakeholder rõ ràng bao gồm người dân, đội cứu hộ, admin tỉnh, lực lượng PCCC, y tế và tình nguyện viên vì mỗi nhóm sẽ có workflow và nhu cầu khác nhau. Hệ thống không nên được tư duy theo kiểu API → Database đơn thuần mà cần tiếp cận theo hướng event-driven system với các sự kiện như SOS_CREATED, TEAM_ASSIGNED, TEAM_MOVING hay RESCUE_COMPLETED để phản ánh đúng bản chất realtime reactive của hệ thống cứu hộ.

Một điểm quan trọng là không nên “AI hóa” bài toán khi chưa cần thiết. Hệ thống này không cần Machine Learning vì bài toán chính là deterministic spatial search chứ không phải prediction. Trọng tâm nên là GIS, Spatial Query, Spatial Indexing và KNN Search. Việc dùng Linear Scan không phải sai nhưng chỉ phù hợp cho prototype hoặc dữ liệu nhỏ vì phải quét toàn bộ đội cứu hộ dẫn đến độ phức tạp O(n), khó scale và không phù hợp realtime dispatching. Do đó hệ thống nên sử dụng PostgreSQL kết hợp PostGIS, Spatial Query, GiST Index và toán tử KNN <-> để tối ưu truy vấn không gian. Không cần tự cài đặt KD-Tree hay R-Tree vì PostGIS đã tối ưu sẵn spatial engine theo chuẩn công nghiệp, giúp dễ bảo vệ đồ án và phù hợp production hơn. Cần lưu ý rõ sự khác nhau giữa geometry và geography trong PostGIS, vì geometry tính theo degree còn geography cho khoảng cách thực tế theo mét, phù hợp hơn với bài toán cứu hộ.

Hệ thống cũng cần phân tích các business rules và failure scenarios để tăng tính thực tế. Ví dụ chỉ đội có trạng thái AVAILABLE mới được dispatch, SOS ở vùng nguy hiểm cần ưu tiên cao hơn, đội quá tải không thể nhận thêm nhiệm vụ, hoặc khi không có đội sẵn sàng thì hệ thống cần escalation lên cấp quản lý. Ngoài ra cần xem xét các trường hợp GPS sai, mất mạng, mất điện, hoặc nhiều SOS xảy ra đồng thời. SOS không nên được xem như một record đơn giản mà phải có lifecycle rõ ràng thông qua state machine như CREATED → PENDING_DISPATCH → TEAM_ASSIGNED → TEAM_MOVING → RESCUING → RESCUED → COMPLETED. Đồng thời cần hiểu rằng nearest team chưa chắc là best team, vì cần cân nhắc thêm capacity, specialization, ETA, tình trạng đường ngập và mức độ ưu tiên của ca cứu hộ. Đây chính là tư duy multi-factor dispatching gần với các hệ thống thực tế như Grab/Uber. Tuy nhiên đối với đồ án sinh viên, chỉ cần mention các hướng nâng cấp như routing optimization, ETA calculation hay flood-aware dispatching trong phần future enhancement thay vì cố gắng triển khai toàn bộ.

Phạm vi dự án cần được giới hạn rõ ràng để tránh ôm đồm. Hệ thống tập trung vào tiếp nhận SOS, GIS visualization, spatial search và rescue dispatching, không bao gồm AI flood prediction, satellite GIS, drone rescue hay triển khai quy mô quốc gia. Trong quá trình phát triển nên đi theo roadmap chuẩn gồm Business Analysis → System Analysis → Technical Design → Prototype thay vì code ngay từ đầu. Cần hoàn thiện problem statement, stakeholders, use cases, business rules, dispatch workflow, sequence diagram, state machine và spatial architecture trước khi triển khai API hay database schema. Công nghệ phù hợp cho hệ thống gồm React/NextJS + Leaflet cho frontend, NestJS + WebSocket cho backend, PostgreSQL + PostGIS cho spatial database, ESP32 + GPS Neo-6M cho thiết bị SOS và GeoServer cho GIS services. Từ khóa quan trọng nên sử dụng xuyên suốt trong tài liệu gồm GIS, Spatial Query, Spatial Indexing, KNN Search, Geospatial Dispatching, Real-time Rescue System, Event-driven Architecture và Spatial Matching. Đây là hướng tiếp cận giúp đề tài vượt khỏi mức CRUD thông thường và tiến gần hơn tới một hệ thống GIS dispatching thực tế.

---

---

# KẾ HOẠCH TRIỂN KHAI: R-Tree (GiST) + Real-time Dispatch
## Hệ thống DORS — Implementation Plan

---

## ⚠️ ĐÁNH GIÁ HIỆN TRẠNG SOCKET — CHƯA SETUP (QUAN TRỌNG)

### Kết quả kiểm tra thực tế (2026-06-15):

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|---------|
| `@nestjs/websockets` | ❌ THIẾU | Không có trong `package.json` |
| `@nestjs/platform-socket.io` | ❌ THIẾU | Không có trong `package.json` |
| `socket.io` | ❌ THIẾU | Không có trong `package.json` |
| Gateway files (`*.gateway.ts`) | ❌ KHÔNG CÓ | Không tồn tại bất kỳ file nào |
| WebSocket trong modules | ❌ KHÔNG CÓ | Không có `@WebSocketGateway` decorator |
| `main.ts` adapter | ❌ THIẾU | Không có `IoAdapter` setup |
| `app.module.ts` | ❌ THIẾU | Không import bất kỳ WebSocket module nào |

> 🔴 **Kết luận: Socket CHƯA được setup bất kỳ thứ gì. Đây là zero-from-scratch.**

### Hậu quả nếu không có Socket:
- Real-time dispatch **KHÔNG hoạt động** — rescue team không nhận được alert
- Admin dashboard **KHÔNG cập nhật** trạng thái SOS realtime
- SOS lifecycle tracking **bị gián đoạn** — phải refresh tay
- Toàn bộ tính năng "realtime" trong báo cáo sẽ **không có thực**

---

## PHASE 0 — CHUẨN BỊ NỀN TẢNG

### Bước 0.1: Cài đặt Socket.io dependencies

```bash
cd be
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install --save-dev @types/socket.io
```

### Bước 0.2: Setup IoAdapter trong `main.ts`

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ THÊM: WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // ... swagger setup ...
  await app.listen(process.env.PORT ?? 3000);
}
```

### Bước 0.3: Tạo GiST Index cho spatial columns

```sql
-- Chạy migration hoặc raw SQL sau khi connect DB
CREATE INDEX IF NOT EXISTS idx_rescue_team_current_location
  ON rescue_team USING GIST (current_location);

CREATE INDEX IF NOT EXISTS idx_rescue_team_base_location
  ON rescue_team USING GIST (base_location);

CREATE INDEX IF NOT EXISTS idx_sos_request_location
  ON sos_request USING GIST (location);
```

TypeORM entity decorator (thêm vào `rescue-team.entity.ts`):
```typescript
@Index({ spatial: true })
@Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
currentLocation?: any;
```

---

## PHASE 1 — R-Tree SPATIAL SEARCH

### Bước 1.1: Tạo Interface Repository cho Spatial Query

**File**: `src/modules/rescue-team/domain/repositories/rescue-team.repository.interface.ts`

```typescript
export interface IRescueTeamRepository extends IBaseRepository<RescueTeam> {
  // Thêm method spatial
  findNearestAvailable(params: {
    longitude: number;
    latitude: number;
    radiusMeters: number;
    teamType?: TeamType;
    provinceId: number;
  }): Promise<{ team: RescueTeam; distanceMeters: number } | null>;

  findNearbyTeams(params: {
    longitude: number;
    latitude: number;
    radiusMeters: number;
    provinceId: number;
    limit?: number;
  }): Promise<{ team: RescueTeam; distanceMeters: number }[]>;
}
```

### Bước 1.2: Implement Spatial Query trong Repository

**File**: `src/infrastructure/database/repositories/rescue-team.repository.ts`

```typescript
async findNearestAvailable(params: {
  longitude: number;
  latitude: number;
  radiusMeters: number;
  teamType?: TeamType;
  provinceId: number;
}): Promise<{ team: RescueTeam; distanceMeters: number } | null> {

  const point = `ST_SetSRID(ST_Point(${params.longitude}, ${params.latitude}), 4326)`;

  const query = this.repo
    .createQueryBuilder('team')
    .select([
      'team.id', 'team.name', 'team.status',
      'team.teamType', 'team.currentLocation',
      `ST_Distance(team.currentLocation::geography, ${point}::geography) AS distance_meters`,
    ])
    .where('team.status = :status', { status: TeamStatus.AVAILABLE })
    .andWhere('team.provinceId = :provinceId', { provinceId: params.provinceId })
    .andWhere(
      `ST_DWithin(
        team.currentLocation::geography,
        ${point}::geography,
        :radius
      )`,
      { radius: params.radiusMeters }
    );

  if (params.teamType) {
    query.andWhere('team.teamType = :teamType', { teamType: params.teamType });
  }

  // Dùng <-> operator để sort (GiST KNN scan)
  query.orderBy(`team.currentLocation <-> ${point}`);
  query.limit(1);

  const result = await query.getRawAndEntities();

  if (!result.entities.length) return null;

  return {
    team: result.entities[0],
    distanceMeters: parseFloat(result.raw[0]?.distance_meters ?? '0'),
  };
}
```

### Bước 1.3: Expanding Radius Strategy Service

**File**: `src/modules/sos-request/application/services/dispatch.service.ts`

```typescript
@Injectable()
export class DispatchService {
  private readonly RADIUS_STEPS = [5000, 10000, 20000, 40000]; // mét
  private readonly MAX_RADIUS = 50000;

  async findBestTeam(params: {
    sosLocation: { longitude: number; latitude: number };
    teamType: TeamType;
    provinceId: number;
  }): Promise<{ team: RescueTeam; distanceMeters: number; radiusUsed: number } | null> {

    for (const radius of this.RADIUS_STEPS) {
      const result = await this.rescueTeamRepo.findNearestAvailable({
        longitude: params.sosLocation.longitude,
        latitude: params.sosLocation.latitude,
        radiusMeters: radius,
        teamType: params.teamType,
        provinceId: params.provinceId,
      });

      if (result) {
        return { ...result, radiusUsed: radius };
      }
    }

    // Không tìm được → null → escalate to admin
    return null;
  }
}
```

---

## PHASE 2 — WEBSOCKET GATEWAY SETUP

### Bước 2.1: Tạo Dispatch Gateway

**File**: `src/modules/sos-request/presentation/gateways/dispatch.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/dispatch',
})
export class DispatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Client kết nối → join room theo role
  handleConnection(client: Socket) {
    const { provinceId, role } = client.handshake.query;
    if (provinceId) {
      client.join(`province:${provinceId}`);  // Admin room
    }
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Rescue team join room riêng để nhận task
  @SubscribeMessage('join-team-room')
  handleJoinTeamRoom(
    @MessageBody() data: { teamId: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`team:${data.teamId}`);
  }

  // === EMIT EVENTS ===

  // Notify rescue team được assigned
  notifyTeamAssigned(teamId: number, sosRequest: any) {
    this.server.to(`team:${teamId}`).emit('sos:assigned', {
      sosRequestId: sosRequest.id,
      location: sosRequest.location,
      severity: sosRequest.severity,
      requestType: sosRequest.requestType,
    });
  }

  // Broadcast SOS mới cho admin tỉnh
  broadcastNewSos(provinceId: number, sosRequest: any) {
    this.server.to(`province:${provinceId}`).emit('sos:created', sosRequest);
  }

  // Update trạng thái SOS realtime
  broadcastSosStatusUpdate(provinceId: number, update: any) {
    this.server.to(`province:${provinceId}`).emit('sos:status-updated', update);
  }

  // Alert admin khi không tìm được đội
  alertNoTeamAvailable(provinceId: number, sosRequest: any) {
    this.server.to(`province:${provinceId}`).emit('sos:no-team-available', {
      sosRequestId: sosRequest.id,
      message: 'Không tìm được đội cứu hộ phù hợp — cần điều phối thủ công',
    });
  }
}
```

### Bước 2.2: Tích hợp Gateway vào SosRequestModule

**File**: `src/modules/sos-request/sos-request.module.ts`

```typescript
@Module({
  imports: [/* ... */],
  providers: [
    SosRequestService,
    DispatchService,
    DispatchGateway,          // ✅ Thêm vào
    // ... repositories ...
  ],
  exports: [DispatchGateway], // ✅ Export để dùng ở module khác nếu cần
})
export class SosRequestModule {}
```

### Bước 2.3: Dispatch Flow hoàn chỉnh trong SosRequestService

```typescript
async createSosRequest(dto: CreateSosRequestDto, requesterId?: number) {
  // 1. Lưu SOS vào DB
  const sos = await this.sosRepo.save({ ...dto, status: SosStatus.PENDING_DISPATCH });

  // 2. Broadcast SOS mới cho admin
  this.dispatchGateway.broadcastNewSos(dto.provinceId, sos);

  // 3. Chạy Spatial NNS tìm đội gần nhất (R-Tree GiST)
  const result = await this.dispatchService.findBestTeam({
    sosLocation: { longitude: dto.longitude, latitude: dto.latitude },
    teamType: dto.requestType as unknown as TeamType,
    provinceId: dto.provinceId,
  });

  if (!result) {
    // 4a. Không tìm được → escalate admin
    await this.sosRepo.updateStatus(sos.id, SosStatus.PENDING_DISPATCH);
    this.dispatchGateway.alertNoTeamAvailable(dto.provinceId, sos);
    return sos;
  }

  // 4b. Tìm được → assign team
  await this.sosRepo.assignTeam(sos.id, result.team.id);
  await this.rescueTeamRepo.updateStatus(result.team.id, TeamStatus.ON_MISSION);

  // 5. Notify rescue team realtime (Socket)
  this.dispatchGateway.notifyTeamAssigned(result.team.id, sos);

  // 6. Broadcast update cho admin
  this.dispatchGateway.broadcastSosStatusUpdate(dto.provinceId, {
    sosId: sos.id,
    status: SosStatus.TEAM_ASSIGNED,
    assignedTeamId: result.team.id,
    distanceMeters: result.distanceMeters,
  });

  return sos;
}
```

---

## PHASE 3 — SOS STATE MACHINE

### Bước 3.1: SOS Lifecycle States

```
CREATED
  │
  ▼
PENDING_DISPATCH  ← Đang tìm đội (NNS đang chạy)
  │
  ├──── Không tìm được đội ──► PENDING_DISPATCH (alert admin)
  │
  ▼
TEAM_ASSIGNED  ← Đội được assign, chưa di chuyển
  │
  ▼
TEAM_MOVING  ← Đội đang trên đường
  │
  ▼
RESCUING  ← Đội đang tại hiện trường
  │
  ▼
RESCUED  ← Nạn nhân được cứu
  │
  ▼
COMPLETED  ← Nhiệm vụ hoàn tất
  │
  └──── (bất kỳ state nào) ──► CANCELLED
```

---

## PHASE 4 — CHECKLIST THỰC HIỆN

### ❌ Chưa làm — Cần làm ngay:

- [ ] `npm install @nestjs/websockets @nestjs/platform-socket.io socket.io`
- [ ] Thêm `IoAdapter` vào `main.ts`
- [ ] Thêm `@Index({ spatial: true })` vào các entity có geometry column
- [ ] Tạo GiST index migration
- [ ] Implement `findNearestAvailable()` trong `RescueTeamRepository`
- [ ] Implement `findNearbyTeams()` trong `RescueTeamRepository`
- [ ] Tạo `DispatchService` với Expanding Radius logic
- [ ] Tạo `DispatchGateway` (Socket.io)
- [ ] Tích hợp Gateway vào `SosRequestModule`
- [ ] Tích hợp dispatch flow vào `SosRequestService`
- [ ] Implement SOS State Machine transitions
- [ ] Test spatial query với PostGIS

### ✅ Đã có — Không cần làm lại:

- [x] `geometry` columns trong tất cả entities (rescue_team, sos_request, user...)
- [x] Docker `postgis/postgis:15-3.4` đã chạy
- [x] `SosRequestModule` đã có skeleton
- [x] `RescueTeamRepository` đã có skeleton
- [x] TypeORM + PostgreSQL connection hoạt động

---

## PHASE 5 — THỨ TỰ ƯU TIÊN (Nên làm theo thứ tự này)

```
1. npm install packages Socket.io          [15 phút]
2. Sửa main.ts thêm IoAdapter             [5 phút]
3. Thêm GiST index vào entities           [15 phút]
4. Implement findNearestAvailable()        [1-2 giờ]
5. Tạo DispatchService (expanding radius)  [1 giờ]
6. Tạo DispatchGateway                    [1-2 giờ]
7. Tích hợp vào SosRequestService         [1 giờ]
8. Test end-to-end                        [1 giờ]

Tổng ước tính: 6-8 giờ
```