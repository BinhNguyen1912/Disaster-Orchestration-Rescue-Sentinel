# Thiết Kế Chi Tiết & Đề Xuất Nâng Cấp Thuật Toán Auto-Dispatch (Phiên bản v6 — Final)
## (R-Tree GiST + Hai pha Gom-Pool/Chuẩn-hóa + Khóa Bi quan SKIP LOCKED + Điều phối kép động + Hàng đợi Phân công Atomic + Đếm Dual Dispatch thuần Postgres)

> **Lịch sử phiên bản:** v6 là phiên bản đóng băng cuối cùng dành cho giai đoạn code. Toàn bộ lỗ hổng logic từ v1–v4 và lỗ hổng kiến trúc Redis Counter phát sinh ở v5 đã được khắc phục triệt để. Không có thêm lỗ hổng logic hoặc kiến trúc mới được phát hiện sau 6 vòng phân tích.

---

## 1. Tổng Quan Thuật Toán Hiện Tại & Hạn Chế (Baseline v1–v4)

Thuật toán điều phối hiện tại được thực thi qua class [DistanceBasedDispatchStrategy](file:///d:/DoAn/DOAN/be/src/modules/sos-request/application/services/distance-based-dispatch.strategy.ts) và phương thức [findAvailableTeamsInRadius](file:///d:/DoAn/DOAN/be/src/modules/rescue-team/infrastructure/persistence/repositories/rescue-team.repository.ts#L121) của repository.

### Công thức tính điểm phạt hiện tại:

$$\text{Score} = \text{distance\_norm} \times W_{dist} + \text{active\_cases\_norm} \times W_{cases} + \text{skill\_mismatch\_norm} \times W_{skill}$$

*(Score thấp nhất là đội phù hợp nhất)*

### 5 Lỗ hổng lớn nhất được phát hiện và đã khắc phục từ các phiên bản trước:

| # | Lỗ hổng | Phiên bản phát hiện | Trạng thái |
|:-:|:--------|:--------------------|:-----------|
| 1 | **Greedy Search Trap** — Dừng sớm ở vòng quét đầu, bỏ lỡ đội tốt hơn ở rìa ngoài | v1 | ✅ Khắc phục ở v5 (Two-Phase Pipeline) |
| 2 | **Bất ổn định điểm số & nén thang đo** — Chuẩn hóa bằng bán kính cố định gây mất cân bằng | v2 | ✅ Khắc phục ở v5 (Hybrid Local Min-Max) |
| 3 | **Mất chỉ mục không gian** — Ép kiểu `::geography` sai cú pháp làm PostgreSQL bỏ qua GiST index | v2 | ✅ Khắc phục ở v5 (Functional Index + migration plan) |
| 4 | **Lock Duration Bloat** — Giữ DB lock trong khi gọi API ngoài (OSRM, Google Maps) | v3 | ✅ Khắc phục ở v5 (Lock Duration Minimization) |
| 5 | **Severity Gaming** — Người dùng khai báo CRITICAL tràn lan để được ưu tiên | v3 | ✅ Khắc phục ở v5 (Severity Origin Segregation) |

### Lỗ hổng kiến trúc mới phát sinh ở v5 và được khắc phục ở v6 (phiên bản này):

| # | Lỗ hổng | Mô tả ngắn | Trạng thái |
|:-:|:--------|:-----------|:-----------|
| 6 | **Redis Counter Capacity Leak** — Counter chỉ INCR, không bao giờ DECR khi slot kết thúc | v5 | ✅ **Khắc phục ở v6** (Bỏ Redis, dùng Postgres COUNT) |
| 7 | **Dual-Write Problem** — Redis và Postgres không đồng bộ giao dịch, gây leak ngay từ bước đầu nếu Postgres rollback | v5 | ✅ **Khắc phục ở v6** (Một nguồn sự thật duy nhất: Postgres) |
| 8 | **Province Scope bị bỏ ngỏ** — Counter Redis toàn cục khiến 1 tỉnh đang thiên tai nặng bị tỉnh khác chiếm hết slot | v5 | ✅ **Khắc phục ở v6** (WHERE province_id trong COUNT query) |
| 9 | **Empty Specialist Pool** — Không có nhánh xử lý khi không tìm thấy bất kỳ đội đúng chuyên môn nào | v5 | ✅ **Khắc phục ở v6** (Fallback 3 cấp liên tỉnh + cảnh báo Admin) |

---

## 2. Giải Pháp Chi Tiết & Thiết Kế Kỹ Thuật

### 2.1. Thiết kế hai pha cho Pipeline điều phối (Two-Phase Dispatch Pipeline)

Luồng điều phối được tách biệt làm 2 pha rõ ràng để giải quyết đồng thời **Tối ưu cục bộ (Greedy Trap)** và **Lật kết quả (Flip-flopping)**:

```
[SOS Request]
      │
      ▼
[Pha 1: Gom Candidate Pool]
      │
      ├─ Vòng quét 1: r = 5km
      │       │
      │       └─ Có đội thỏa mãn score_acceptable (≤ 0.5)?
      │               │ Không → Vòng quét 2: r = 10km → Gom thêm
      │               │ Có (hoặc đã hết radius_steps) → Chốt Pool
      ▼
[Pool cuối cùng]
      │
      ▼
[Pha 2: Chuẩn hóa & Tính Score đồng bộ (Hybrid Local Min-Max)]
      │
      ▼
[Chọn đội tối ưu → Kiểm tra Dual Dispatch → Quyết định điều phối]
```

**Pha 1 — Gom Candidate Pool:**

Chạy tuần tự qua các bán kính quét để tích lũy danh sách ứng viên. Không tính score hay chuẩn hóa nửa chừng. Điểm sơ bộ (Heuristic Stopping Score) chỉ dùng làm tiêu chí dừng sớm, hoàn toàn không dùng để xếp hạng cuối cùng:

$$\text{Score\_sơ\_bộ} = \frac{\text{distance}}{\text{radius\_bước\_hiện\_tại}} \times W_{dist} + \text{active\_cases\_norm} \times W_{cases} + \text{skill\_mismatch\_norm} \times W_{skill}$$

> **Lý do dùng Heuristic ở Pha 1:** Trong cùng một vòng quét, tất cả đội chia chung mẫu số (bán kính vòng hiện tại), nên thứ tự tương đối giữa các đội được bảo toàn tuyệt đối. Điểm này chỉ phục vụ quyết định "có nên mở rộng vòng quét tiếp không" — không bao giờ được dùng để chọn đội.

**Quy tắc Fallback khi hết bước quét:**

Nếu đã quét qua toàn bộ các mốc bán kính cấu hình mà không có đội nào đạt điểm sơ bộ dưới ngưỡng, hệ thống **vẫn chốt pool hiện có và chọn đội có điểm phạt tốt nhất**. Hệ thống chỉ trả về `null` khi pool ứng viên **hoàn toàn trống rỗng** sau khi đã quét hết tất cả bán kính.

**Pha 2 — Chuẩn hóa & Tính Score đồng bộ (Hybrid Local Min-Max):**

Khi đã có pool cuối cùng, chạy chuẩn hóa khoảng cách một lần duy nhất:

$$\text{distance\_norm} = \frac{\text{distance} - \text{min\_distance}}{\max(\text{max\_distance} - \text{min\_distance},\ \text{dispatch.distance\_delta\_threshold\_meters})}$$

Mẫu số `dispatch.distance_delta_threshold_meters` (mặc định `5000` mét) ngăn **khuếch đại khoảng cách nhỏ** — ví dụ chênh lệch 200m giữa 2 đội cùng đứng ở 10km sẽ không bị phóng đại thành mức phạt tối đa `1.0`.

**Trường hợp đặc biệt — Pool chỉ có 1 đội:**

Khi `pool.length === 1`, đặt `distance_norm = 0.0` và bỏ qua phép tính Min-Max để tránh lỗi chia cho 0. Đội duy nhất đó sẽ được chọn vô điều kiện (nếu không phải trường hợp trả về `null`).

---

### 2.2. Khắc phục lỗi Mất Chỉ Mục Không Gian (Functional Index)

Nếu giữ nguyên schema kiểu `geometry`, bắt buộc phải định nghĩa Functional Index trong DB:

```sql
CREATE INDEX idx_rescue_team_location_geog
ON rescue_team USING gist (((currentLocation)::geography));
```

> **Rủi ro lỗi câm (Silent Index Bypass):** Trình tối ưu PostgreSQL chỉ dùng functional index khi biểu thức trong `WHERE`/`ORDER BY` **khớp chính xác từng ký tự** với định nghĩa index.
>
> - `rt.currentLocation::geography` → **Dùng index ✅**
> - `CAST(rt.currentLocation AS geography)` → **Bỏ qua index, Seq Scan ❌**

**Giải pháp lâu dài:** Di chuyển cột `currentLocation` sang kiểu `geography(Point, 4326)` trong schema. Các truy vấn sẽ trở thành native, loại bỏ toàn bộ rủi ro bảo trì liên quan đến cú pháp ép kiểu.

---

### 2.3. Khóa đồng thời hiệu năng cao sử dụng `SKIP LOCKED`

Để tránh race condition TOCTOU khi nhiều SOS được xử lý song song mà không gây blocking ở DB:

```typescript
// Bước 1: Truy vấn ứng viên với SKIP LOCKED (ngoài transaction chính)
const candidates = await this.repo.createQueryBuilder('rt')
  .where('rt.status = :status', { status: TeamStatus.AVAILABLE })
  // ... các bộ lọc không gian PostGIS ...
  .limit(10)
  .setLock('pessimistic_write')
  .setOnLocked('skip_locked') // Bỏ qua đội đang bị lock bởi transaction khác
  .getRawAndEntities();
```

**Nguyên tắc giữ khóa tối thiểu (Lock Duration Minimization):**

| Bước | Hành động | Trong transaction? |
|:----:|:----------|:-------------------|
| 1 | Gọi API ngoài (OSRM/Google Maps) lấy ETA cho ứng viên | ❌ Ngoài |
| 2 | Tính điểm, xếp hạng ứng viên | ❌ Ngoài |
| 3 | Mở transaction ngắn: `FOR UPDATE` dòng đội được chọn tốt nhất | ✅ Trong |
| 4 | Kiểm tra lại trạng thái đội — nếu đã BUSY do race condition: rollback, chọn đội tốt thứ hai | ✅ Trong |
| 5 | Cập nhật trạng thái → `DISPATCHED`, tăng `activeCasesCount`, COMMIT | ✅ Trong |

Thời gian giữ lock mục tiêu: **< 50ms**.

---

### 2.4. Trọng số động theo Độ khẩn cấp & Ngăn chặn lạm dụng (Severity Gaming)

Ma trận trọng số được lưu trong `system_setting` (Key: `dispatch.weight_matrix`):

| Độ khẩn cấp | $W_{dist}$ | $W_{cases}$ | $W_{skill}$ | Ý nghĩa nghiệp vụ |
|:------------|:----------:|:-----------:|:-----------:|:------------------|
| **CRITICAL** | `0.8` | `0.1` | `0.1` | Tốc độ là số 1, chấp nhận lệch chuyên môn nhẹ hoặc quá tải nhẹ |
| **HIGH** | `0.6` | `0.2` | `0.2` | Ưu tiên cao cho khoảng cách, cân nhắc tải vừa phải |
| **DEFAULT** | `0.5` | `0.3` | `0.2` | Trọng số cân bằng chuẩn hệ thống |

# Giải thích Ma trận Trọng số (Weight Matrix)

## Ý nghĩa các con số

Các số này là **trọng số** — tức là "mức độ quan trọng" của từng yếu tố khi tính điểm phạt cuối cùng. Vì chúng biểu diễn phần trăm đóng góp, tổng bắt buộc phải bằng `1.0` (tức 100%).

### Ví dụ với mức CRITICAL:

| Yếu tố | Trọng số | Ý nghĩa |
|:-------|:--------:|:--------|
| Khoảng cách | `0.8` | Chiếm 80% quyết định |
| Tải trọng | `0.1` | Chiếm 10% quyết định |
| Chuyên môn | `0.1` | Chiếm 10% quyết định |
| **Tổng** | **`1.0`** | **= 100%** |

### Công thức tính Score:

$$\text{Score} = \underbrace{\text{distance\_norm} \times 0.8}_{80\%} + \underbrace{\text{cases\_norm} \times 0.1}_{10\%} + \underbrace{\text{skill\_norm} \times 0.1}_{10\%}$$

## Tại sao tổng phải bằng 1.0?

Mỗi `_norm` đã được chuẩn hóa về khoảng `[0, 1]`. Nhân với trọng số rồi cộng lại:

- **Score tối đa:** `0.8 + 0.1 + 0.1 = 1.0`
- **Score tối thiểu:** `0.0`

Khoảng `[0, 1]` này giúp so sánh và đặt ngưỡng dễ dàng.

> **Lưu ý:** Nếu tổng trọng số khác `1.0`, Score sẽ vượt ra ngoài khoảng đó, mất đi ý nghĩa chuẩn hóa và các ngưỡng như `score_acceptable_threshold = 0.5` sẽ không còn đáng tin cậy nữa.

#### Cơ chế ngăn chặn lạm dụng (Severity Origin Segregation):

**Luồng Auto-dispatch tức thời (IoT Bypass):** Chỉ kích hoạt khi SOS đến từ thiết bị IoT (cảm biến ngập, phao khẩn cấp, v.v.). Hệ thống tự thiết lập `CRITICAL` và chạy auto-dispatch ngay lập tức, song song gửi thông báo cho Trực ban.

**Luồng Xác nhận thủ công (Human-in-the-loop):** Với SOS tự khai báo qua app, hệ thống mặc định mức `MEDIUM`. Trực ban điều phối viên xem xét hình ảnh/thông tin hiện trường trên Dashboard trước khi nâng cấp hoặc kích hoạt auto-dispatch.

---

### 2.5. Cơ chế cấu hình và Kiểm tra Ma trận Chuyên môn (Skill Matrix)

**Ma trận chuyên môn động** được lưu dạng JSON trong `system_setting` (Key: `dispatch.skill_mapping`), ánh xạ mức độ lệch chuyên môn từ `0.0` (khớp hoàn toàn) đến `1.0` (hoàn toàn sai lệch).

**Startup Validation:** NestJS Service implement `OnApplicationBootstrap` tự động thực hiện khi khởi động server:

- Validate cú pháp JSON của `dispatch.skill_mapping`
- Kiểm tra tính toàn vẹn của tất cả `SosRequestType` và `TeamType` enum
- Kiểm tra bắt buộc `dispatch.distance_delta_threshold_meters` phải tồn tại và `> 0` — nếu thiếu, ghi log ERROR và gán giá trị fallback an toàn `5000` mét để tránh lỗi chia cho 0 ở runtime

---

### 2.6. Chiến lược Điều phối kép động (Dynamic Dual Dispatch) & Hàng đợi Phân công Atomic

#### 2.6.1. Kiểm soát Năng lực Dual Dispatch — Thuần Postgres, Không Redis

> **Vấn đề đã khắc phục ở v6:** Phiên bản v5 sử dụng Redis Atomic Counter (INCR/DECR) để kiểm soát số ca Dual Dispatch đồng thời. Giải pháp này tạo ra 3 lỗ hổng nghiêm trọng:
>
> 1. **Capacity Leak vĩnh viễn:** Counter chỉ INCR khi bắt đầu, không có điểm DECR tại mọi điểm kết thúc vòng đời (Handoff thành công, Escalation timeout, SOS bị hủy). Sau thời gian vận hành, counter đạt ngưỡng và Dual Dispatch bị vô hiệu hóa âm thầm dù hệ thống thực tế rảnh rỗi.
> 2. **Dual-Write Problem:** Nếu INCR Redis thành công nhưng transaction Postgres tạo `dispatch_queue` sau đó rollback → counter Redis đã tăng nhưng record không tồn tại → leak ngay từ bước đầu.
> 3. **Province Scope bị bỏ ngỏ:** Counter Redis toàn cục khiến 1 tỉnh đang thiên tai nặng bị tỉnh khác "chiếm hết slot" dù 2 tỉnh hoàn toàn độc lập về tài nguyên.

**Giải pháp v6 — Đếm trực tiếp trong Postgres, trong cùng transaction:**

```sql
-- Chạy trong cùng transaction đang INSERT vào dispatch_queue
-- Đọc số ca Dual Dispatch đang thực sự tồn tại trong DB (theo province)
SELECT COUNT(*)
FROM dispatch_queue
WHERE is_dual_dispatch = true
  AND province_id = :provinceId
FOR UPDATE;
```

Cách này mang lại các đảm bảo:

- **Tự động tăng/giảm:** Mỗi `INSERT` vào `dispatch_queue` với `is_dual_dispatch = true` tăng count; mỗi `DELETE` giảm count — không cần nhớ gọi DECR ở bất kỳ đâu.
- **Không bao giờ leak:** Khi transaction rollback, cả INSERT record và phép đếm đều rollback theo — không có trạng thái không nhất quán.
- **Province-scoped:** `WHERE province_id = :provinceId` đảm bảo mỗi tỉnh có quota độc lập.
- **Một nguồn sự thật duy nhất:** Đúng triết lý mà các phần 2.3 và 2.6.2/2.6.3 đang theo đuổi — toàn bộ quyết định concurrency đều dựa vào Postgres pessimistic lock.

**Luồng kiểm tra và tạo Dual Dispatch (Atomic):**

```typescript
async tryStartDualDispatch(
  sosRequestId: number,
  provinceId: number,
  manager: EntityManager
): Promise<'dual' | 'single'> {
  const maxDual = await this.configService.get<number>(
    'dispatch.max_simultaneous_dual_dispatches', 4
  );

  // Đếm và lock đồng thời trong cùng transaction
  const currentCount = await manager
    .createQueryBuilder(DispatchQueueEntity, 'dq')
    .select('COUNT(*)', 'cnt')
    .where('dq.is_dual_dispatch = true')
    .andWhere('dq.province_id = :provinceId', { provinceId })
    .setLock('pessimistic_write') // Lock toàn bộ tập kết quả
    .getRawOne()
    .then(r => parseInt(r.cnt, 10));

  if (currentCount >= maxDual) {
    // Vượt ngưỡng → hạ cấp Single Dispatch
    return 'single';
  }

  // Còn slot → cho phép Dual Dispatch
  // INSERT dispatch_queue với is_dual_dispatch = true sẽ tự tăng count
  return 'dual';
}
```
# Giải thích Cơ chế Dual Dispatch

## 1. Dual Dispatch là gì?

Thông thường, khi có một ca cấp cứu hoặc cứu hộ (SOS request), hệ thống sẽ dùng phương thức **Single Dispatch (Điều phối đơn)**: chỉ tìm và gán **01 đội cứu hộ duy nhất** đến ứng cứu. Khi nào đội đó từ chối hoặc thất bại, hệ thống mới tìm đội khác.

Tuy nhiên, trong các tình huống thiên tai khẩn cấp (như lũ lụt), nếu chỉ gọi 1 đội thì rủi ro rất cao — đội có thể bị kẹt dòng nước, mất tín hiệu, hoặc di chuyển chậm.

Do đó, hệ thống sinh ra cơ chế **Dual Dispatch (Điều phối kép)**:

> **Dual Dispatch** là hành động phát lệnh điều phối **đồng thời** cho **02 đội cứu hộ độc lập** chạy đua đến cùng một địa điểm SOS. Đội nào tiếp cận và hỗ trợ người dân thành công trước thì đội còn lại sẽ được **giải phóng** để đi làm nhiệm vụ khác.

---

## 2. Đoạn code và tài liệu đang giải quyết bài toán gì?

Vì tính chất "gọi 1 lúc 2 đội" rất tốn tài nguyên (xuồng cứu hộ, nhân lực), hệ thống bắt buộc phải giới hạn:

> Tại một thời điểm, **một tỉnh chỉ được phép có tối đa `N` ca Dual Dispatch chạy đồng thời** (trong ví dụ là tối đa **4 ca**).

Tài liệu đang so sánh cách quản lý "số lượng ca Dual Dispatch đang chạy" giữa **v5 (Redis — bị lỗi)** và **v6 (Postgres — tối ưu)**.

---

### Lỗi ở bản cũ (v5 — Redis Counter)

Hệ thống dùng một **biến đếm trên Redis**. Cứ mỗi lần chạy Dual Dispatch thì tăng lên 1, cứu hộ xong thì giảm đi 1.

**Hậu quả — Capacity Leak:**

Có những ca cứu hộ bị hủy giữa chừng hoặc bị timeout, lập trình viên quên không trừ số trên Redis đi. Kết quả là Redis cứ báo:

> *"Đang có 4 ca chạy rồi, không cho chạy Dual nữa"*

...trong khi thực tế ngoài đời **chẳng có ca nào đang chạy cả**.

---

### Giải pháp ở bản mới (v6 — Postgres Pessimistic Lock)

Không dùng biến đếm trung gian nào nữa. Thay vào đó:

**Bước 1 — Đếm trực tiếp trong DB:**

Mỗi lần có ca SOS mới, hệ thống chọc thẳng vào bảng `dispatch_queue` và đếm:

```sql
SELECT COUNT(*)
FROM dispatch_queue
WHERE is_dual_dispatch = true
  AND province_id = :provinceId
FOR UPDATE;
```

**Bước 2 — Kiểm tra ngưỡng và khóa:**

Nếu đếm ra `< 4`, hệ thống lập tức **khóa** (`pessimistic_write`) tập dữ liệu đó lại để không ai tranh giành, rồi cho phép ca SOS này được dùng cơ chế Dual Dispatch.

**Kết quả:**

| Sự kiện | Hành động DB | Số đếm |
|:--------|:------------|:------:|
| Thêm ca Dual Dispatch mới | `INSERT` vào `dispatch_queue` | Tự tăng |
| Hoàn thành ca | `DELETE` khỏi `dispatch_queue` | Tự giảm |
| Hủy ca / Timeout | `DELETE` khỏi `dispatch_queue` | Tự giảm |
| Transaction rollback | Record chưa commit → không tồn tại | Không thay đổi |

> Cách này giúp dữ liệu luôn **chính xác 100%**: thêm ca thì tự tăng, xóa/hủy/hoàn thành ca thì DB tự giảm — **không bao giờ lo bị sai lệch số liệu**.
#### 2.6.2. Cấu trúc Bảng Hàng đợi Phân công (`dispatch_queue`)

```sql
CREATE TABLE dispatch_queue (
  id            SERIAL PRIMARY KEY,
  sos_request_id INT     NOT NULL REFERENCES sos_request(id) ON DELETE CASCADE,
  team_id        INT     NOT NULL REFERENCES rescue_team(id),
  province_id    INT     NOT NULL,                          -- Scope kiểm soát Dual Dispatch
  is_dual_dispatch BOOLEAN NOT NULL DEFAULT false,          -- Flag đánh dấu ca kép
  priority_score FLOAT   NOT NULL,                          -- Tính từ severity + thời gian chờ
  queued_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dispatch_queue_team_priority
  ON dispatch_queue(team_id, priority_score DESC, queued_at ASC);

CREATE INDEX idx_dispatch_queue_province_dual
  ON dispatch_queue(province_id, is_dual_dispatch)
  WHERE is_dual_dispatch = true;                            -- Partial index tối ưu phép đếm quota
```

#### 2.6.3. Cơ chế Bàn giao Atomic khi Đội hoàn thành ca (`onTeamBecomesAvailable`)

Khi Đội A chuyển trạng thái ca hiện tại thành `RESOLVED` hoặc `CANCELLED`, toàn bộ luồng diễn ra trong **một transaction duy nhất**:

```typescript
async releaseTeamAndResolveQueue(
  teamId: number,
  manager: EntityManager
): Promise<void> {
  // 1. Lock dòng đội cứu hộ
  const team = await manager
    .createQueryBuilder(RescueTeamEntity, 'rt')
    .setLock('pessimistic_write')
    .where('rt.id = :teamId', { teamId })
    .getOne();

  // 2. Tìm ca tiếp theo đang xếp hàng của đội này
  const nextInQueue = await manager
    .createQueryBuilder(DispatchQueueEntity, 'dq')
    .where('dq.team_id = :teamId', { teamId })
    .orderBy('dq.priority_score', 'DESC')
    .addOrderBy('dq.queued_at', 'ASC')
    .setLock('pessimistic_write')
    .setOnLocked('skip_locked') // Tránh tranh chấp với Cronjob Escalation
    .getOne();

  if (nextInQueue) {
    // 3a. Có hàng đợi → Gán ngay, đội tiếp tục BUSY
    await manager.update(SosRequestEntity, nextInQueue.sosRequestId, {
      assignedTeamId: team.id,
      status: SosStatus.DISPATCHED,
      assignedAt: new Date(),
    });

    // Tính lại tải trọng chính xác: trừ ca cũ vừa xong, cộng ca mới từ queue
    // Math.max(0, ...) ngăn activeCasesCount xuống âm (defensive programming)
    team.activeCasesCount = Math.max(0, (team.activeCasesCount ?? 1) - 1) + 1;
    // Trạng thái đội giữ nguyên BUSY
    await manager.save(team);

    // Xóa bản ghi hàng đợi → COUNT(*) FOR UPDATE trong transaction khác sẽ giảm tự động
    await manager.delete(DispatchQueueEntity, nextInQueue.id);
  } else {
    // 3b. Không còn hàng đợi → Giải phóng về AVAILABLE
    team.status = TeamStatus.AVAILABLE;
    team.activeCasesCount = Math.max(0, (team.activeCasesCount ?? 1) - 1);
    await manager.save(team);
  }
}
```

#### 2.6.4. Tranh chấp Cronjob Escalation vs. Handoff — "Ai lock trước thắng"

**Tình huống:** Đội A vừa hoàn thành ca cũ đúng vào thời điểm Cronjob Escalation phát hiện ca trong hàng đợi của Đội A đã quá hạn. Cả 2 luồng cùng nhắm vào cùng 1 dòng trong `dispatch_queue`.

**Cơ chế giải quyết:** Cả Cronjob Escalation lẫn Handoff đều bắt buộc dùng `SELECT ... FOR UPDATE SKIP LOCKED`:

| Kịch bản | Hành vi |
|:---------|:--------|
| **Handoff lock trước** | Handoff gán việc cho Đội A. Cronjob chạy sau thấy dòng đang bị lock → bỏ qua (`skip_locked`) → không escalate ca đã được bàn giao. |
| **Cronjob lock trước** | Cronjob khóa và xóa dòng queue → chạy lại auto-dispatch tìm đội khác. Handoff chạy sau thấy `nextInQueue = null` → giải phóng Đội A về `AVAILABLE` an toàn. Ca SOS không bị gán trùng. |

Trong cả hai kịch bản, `is_dual_dispatch` của dòng bị DELETE sẽ tự động giảm COUNT Dual Dispatch của province — không cần thêm bất kỳ DECR thủ công nào.

#### 2.6.5. Cơ chế Timeout Hàng đợi & Leo thang (Queue Timeout & Escalation)

- Tham số: `dispatch.queue_timeout_seconds = 1800` (30 phút)
- Cronjob chạy mỗi 1 phút, quét `dispatch_queue` bằng `FOR UPDATE SKIP LOCKED`
- Khi phát hiện hàng đợi quá hạn:
  1. Xóa bản ghi khỏi `dispatch_queue` (COUNT tự giảm)
  2. Kích hoạt lại Auto-dispatch từ đầu với bán kính mở rộng
  3. Đẩy cảnh báo leo thang lên Dashboard của Admin

#### 2.6.6. Quy tắc Đánh đổi Nghiệp vụ khi Quá tải (Single Dispatch Tie-Break Rule)

Khi hệ thống quá tải (tỷ lệ khả dụng province < 30%) và hạ cấp về Single Dispatch, áp dụng quy tắc sau:

**Trường hợp ca cần thiết bị chuyên dụng (`requires_equipment: true`) — đội chuyên môn đúng loại (`PCCC`) đang bận:**

Hệ thống **ưu tiên Chuyên môn (Specialization-First)**: xếp hàng đợi ca SOS vào hàng chờ của Đội chuyên nghiệp gần nhất, **không gửi đội sai chuyên môn đi một mình**, nhằm bảo toàn nhân lực quý giá.

**Ngoại lệ duy nhất:** Nếu thời gian nằm trong hàng đợi vượt quá 15 phút, hệ thống tự động đẩy cảnh báo khẩn cấp lên màn hình Admin để can thiệp thủ công (trưng dụng phương tiện hoặc hạ cấp tiêu chuẩn kỹ thuật).

#### 2.6.7. Fallback 3 cấp khi Không tìm thấy Đội đúng Chuyên môn

> **Lỗ hổng v5 đã khắc phục:** Quy tắc Tie-Break ở v5 giả định luôn tồn tại ít nhất 1 đội PCCC nào đó (dù bận) trong phạm vi tìm kiếm. Nếu pool đội chuyên môn hoàn toàn trống (0 đội PCCC, dù bận hay rảnh, sau khi đã quét hết `radius_steps`), `team_id` để gán vào `dispatch_queue` sẽ là `null` — gây lỗi constraint vi phạm NOT NULL.

**Chuỗi Fallback 3 cấp khi `specialist_pool = empty`:**

```
Cấp 1: Mở rộng bán kính liên tỉnh
        → Tìm đội PCCC từ tỉnh lân cận (bán kính mở rộng theo cấu hình)
        → Nếu tìm thấy: xếp hàng đợi bình thường

Cấp 2: Cảnh báo khẩn cấp Admin
        → Đẩy alert lên Dashboard ngay lập tức
        → Dispatcher can thiệp thủ công (trưng dụng, điều phối liên ngành)

Cấp 3: Ghi nhận SOS vào trạng thái PENDING_SPECIALIST
        → Không gán team_id (giữ null hợp lệ với cột nullable riêng biệt)
        → Cronjob tiếp tục quét lại mỗi phút cho đến khi tìm được đội
        → Không bao giờ cố gán team_id = null vào dispatch_queue
```

**Thay đổi schema để hỗ trợ Fallback Cấp 3:**

```sql
-- Thêm cột trạng thái chờ chuyên môn vào bảng SOS Request
ALTER TABLE sos_request
  ADD COLUMN specialist_pending BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN specialist_type    TEXT,      -- Loại đội chuyên môn đang tìm
  ADD COLUMN pending_since      TIMESTAMP; -- Để Cronjob tính thời gian chờ
```

---

## 3. Ví Dụ Minh Họa Nghiệp Vụ Từng Bước (2 Vòng Quét, 2 Pha)

### Thiết lập Kịch bản:

- **Yêu cầu SOS:** Ca hỏa hoạn `FIRE_FIGHTING`, phát hiện từ thiết bị IoT → độ khẩn cấp **`CRITICAL`**
- **Trọng số động:** $W_{dist} = 0.8$, $W_{cases} = 0.1$, $W_{skill} = 0.1$
- **Bán kính quét:** `dispatch.radius_steps = [5000, 10000]`
- **Ngưỡng dừng sớm:** `dispatch.score_acceptable_threshold = 0.5`
- **Ngưỡng dung sai khoảng cách:** `dispatch.distance_delta_threshold_meters = 3000`
- **Ma trận Chuyên môn:**
  - `PCCC` → lệch `0.0` (khớp hoàn toàn)
  - `QUAN_SU` → lệch `0.5` (hỗ trợ cơ giới)
  - `DAN_PHONG` → lệch `1.0` (không đúng chuyên môn)
- **Trạng thái Dual Dispatch:** `current_count = 2 / max = 4` → còn slot

---

### PHA 1: GOM ỨNG VIÊN

#### Vòng quét 1 (r = 5000m):

Tìm thấy 2 đội:

| Đội | Loại | Khoảng cách | Tải trọng | Lệch chuyên môn |
|:----|:-----|:-----------:|:---------:|:---------------:|
| A | PCCC | 4500m | 4/5 ca → `0.80` | `0.0` |
| B | DAN_PHONG | 3000m | 1/10 ca → `0.10` | `1.0` |

**Kiểm tra điểm sơ bộ (mẫu số = bán kính vòng 1 = 5000m):**

$$\text{Score\_sơ\_bộ\_A} = \frac{4500}{5000} \times 0.8 + 0.80 \times 0.1 + 0.0 \times 0.1 = 0.72 + 0.08 + 0.00 = \mathbf{0.80}$$

$$\text{Score\_sơ\_bộ\_B} = \frac{3000}{5000} \times 0.8 + 0.10 \times 0.1 + 1.0 \times 0.1 = 0.48 + 0.01 + 0.10 = \mathbf{0.59}$$

Cả hai đều vượt ngưỡng `0.5` (Đội A quá tải; Đội B gần nhưng sai chuyên môn). → **Không dừng sớm, mở rộng sang Vòng 2.**

#### Vòng quét 2 (r = 10000m, quét thêm từ 5km–10km):

Tìm thêm 1 đội:

| Đội | Loại | Khoảng cách | Tải trọng | Lệch chuyên môn |
|:----|:-----|:-----------:|:---------:|:---------------:|
| C | QUAN_SU | 6000m | 1/8 ca → `0.125` | `0.5` |

**Đã quét hết `radius_steps` → Chốt pool.**

**Pool cuối cùng:** Đội A (4500m), Đội B (3000m), Đội C (6000m).

---

### PHA 2: CHUẨN HÓA & TÍNH SCORE ĐỒNG BỘ

#### Bước 2.1: Hybrid Local Min-Max

$$D = \{3000, 4500, 6000\} \text{ mét}$$

- $\text{min\_distance} = 3000m$ (Đội B)
- $\text{max\_distance} = 6000m$ (Đội C)
- Hiệu thực tế: $6000 - 3000 = 3000m$
- Mẫu số: $\max(3000, 3000) = 3000$

| Đội | Công thức | `distance_norm` |
|:----|:----------|:---------------:|
| A (4500m) | $(4500 - 3000) / 3000$ | `0.50` |
| B (3000m) | $(3000 - 3000) / 3000$ | `0.00` |
| C (6000m) | $(6000 - 3000) / 3000$ | `1.00` |

#### Bước 2.2: Tính tổng Score cuối cùng ($W = [0.8,\ 0.1,\ 0.1]$ cho CRITICAL)

$$Score_A = 0.50 \times 0.8 + 0.80 \times 0.1 + 0.00 \times 0.1 = 0.40 + 0.08 + 0.00 = \mathbf{0.48}$$

$$Score_B = 0.00 \times 0.8 + 0.10 \times 0.1 + 1.00 \times 0.1 = 0.00 + 0.01 + 0.10 = \mathbf{0.11}$$

$$Score_C = 1.00 \times 0.8 + 0.125 \times 0.1 + 0.50 \times 0.1 = 0.80 + 0.0125 + 0.05 = \mathbf{0.8625}$$

**Xếp hạng: Đội B (0.11) < Đội A (0.48) < Đội C (0.8625)**

---

### KẾT LUẬN ĐIỀU PHỐI

**Kiểm tra Dual Dispatch quota (trong transaction, thuần Postgres):**

```sql
SELECT COUNT(*) FROM dispatch_queue
WHERE is_dual_dispatch = true AND province_id = :provinceId
FOR UPDATE;
-- Kết quả: 2 < 4 (max) → Cho phép Dual Dispatch
```

Ca hỏa hoạn có `requires_equipment = true` → áp dụng **Dual Dispatch**:

1. **Lực lượng phản ứng nhanh:** Điều phối ngay **Đội B (Dân phòng, 3000m, score 0.11)** — sơ tán khẩn cấp hiện trường.
2. **Lực lượng chuyên môn sâu:** Xếp hàng đợi **Đội A (PCCC, 4500m)** — đang bận ca cũ. Bản ghi `dispatch_queue` được tạo với `is_dual_dispatch = true`, `province_id` đầy đủ.

Khi Đội A hoàn thành ca cũ, `onTeamBecomesAvailable` thực thi handoff trong 1 transaction:
- Gán ca SOS cho Đội A
- `activeCasesCount`: giảm 1 (ca cũ xong) + tăng 1 (ca mới) = giữ nguyên
- Xóa bản ghi `dispatch_queue` → COUNT Dual Dispatch giảm về 1

---

## 4. Danh Mục Các Ca Kiểm Thử (Test Cases Suite) Bắt Buộc

| # | Tên Test Case | Mục tiêu kiểm tra | Kịch bản | Kết quả kỳ vọng |
|:-:|:-------------|:------------------|:---------|:----------------|
| 1 | **Monotonicity & Stability Test** | Thứ hạng giữa các đội cố định không bị đảo lộn khi mở rộng pool | Chạy với pool {A, B}; thêm C, chạy lại | Thứ hạng tương đối A vs B giữ nguyên ở cả hai lần |
| 2 | **Index Usage Test** | Chỉ mục không gian GiST hoạt động đúng | Thực thi query qua ORM + `EXPLAIN ANALYZE` | Kết quả phải chứa `Index Scan using idx_rescue_team_location_geog` |
| 3 | **Concurrency Stress Test** | Không gán trùng đội khi bão SOS đồng thời | 50 request song song, chỉ có 5 đội khả dụng | Không đội nào bị gán trùng; request thừa vào queue hoặc fallback |
| 4 | **Lock Duration Test** | Thời gian chiếm giữ khóa DB < 50ms | Đo thời gian mở transaction đến COMMIT khi có giả lập chậm API ngoài | Lock < 50ms; lời gọi API ngoài phải xảy ra trước khi mở transaction |
| 5 | **Skill Matrix Validator Test** | Bộ validator startup phát hiện cấu hình sai | Cấu hình thiếu 1 loại SOS hoặc sai tên đội trong JSON | Hệ thống ghi log WARNING/ERROR rõ ràng ngay khi bootstrap |
| 6 | **Severity Bypass Test** | SOS từ IoT được auto-dispatch ngay, không chờ duyệt | Giả lập SOS từ thiết bị IoT với CRITICAL | Auto-dispatch chạy tức thì, không cần Trực ban phê duyệt |
| 7 | **Workload Decrement Test** | Giải phóng tài nguyên sau khi xong nhiệm vụ | Chuyển SOS sang RESOLVED hoặc CANCELLED | `activeCasesCount` giảm 1; đội về AVAILABLE nếu count = 0 |
| 8 | **Edge Case: Pool = 1** | Không crash khi pool chỉ có 1 đội (tránh chia cho 0) | Chỉ 1 đội thỏa mãn điều kiện trong tất cả bán kính | `distance_norm = 0.0`, hệ thống chạy bình thường, chọn đội duy nhất |
| 9 | **Dual Dispatch Action Test** | Điều phối kép đúng đắn khi ca cần thiết bị | SOS hỏa hoạn với `requires_equipment = true`; có 1 đội dân phòng rảnh gần, 1 đội PCCC đang bận | Gán dân phòng đi ngay + tạo bản ghi queue cho PCCC (`is_dual_dispatch = true`) |
| 10 | **Capacity Cannibalization Test** | Tự động hạ cấp Single Dispatch khi quá tải | Tỷ lệ khả dụng province < 30%; gửi SOS cần thiết bị chuyên dụng | Hệ thống hạ cấp Single Dispatch, chỉ cử 1 đội, bảo toàn tài nguyên |
| 11 | **Atomic Queue Resolution Test** | Handoff atomic, `activeCasesCount` đúng, SOS mới không cướp được Đội A | Đội A đang bận, có 1 ca trong queue; kích hoạt RESOLVED + gửi SOS mới đồng thời | Đội A nhận ca trong queue; count = giảm 1 + tăng 1 = không đổi; SOS mới không gán được Đội A |
| 12 | **Queue Timeout Escalation Test** | Cronjob phát hiện và xử lý hàng đợi quá hạn | Ca SOS vào queue Đội A; giả lập trôi > 30 phút | Cronjob xóa khỏi queue, chạy lại auto-dispatch, đẩy cảnh báo lên Dashboard |
| 13 | **Dual Dispatch Count Accuracy Test** *(mới ở v6)* | Postgres COUNT tự động tăng/giảm đúng theo vòng đời dispatch_queue | Tạo 3 ca Dual Dispatch (INSERT 3 dòng `is_dual_dispatch=true`); hoàn thành 2 ca (DELETE 2 dòng); tạo thêm 1 ca mới | COUNT = 2 sau bước 2; COUNT = 2 sau bước 3 (không cần DECR thủ công) |
| 14 | **Province Quota Isolation Test** *(mới ở v6)* | Quota Dual Dispatch độc lập theo từng tỉnh | Lấp đầy quota 4 slot của tỉnh A; gửi SOS Dual Dispatch từ tỉnh B | Tỉnh B vẫn được phép Dual Dispatch (quota độc lập); tỉnh A tiếp tục bị giới hạn |
| 15 | **Postgres Rollback Counter Test** *(mới ở v6)* | Không leak count khi transaction Postgres rollback | Bắt đầu Dual Dispatch, rollback transaction tạo dispatch_queue do lỗi DB giả lập | COUNT không tăng sau rollback; hệ thống không bị hiểu nhầm là đã dùng 1 slot |
| 16 | **Empty Specialist Pool Fallback Test** *(mới ở v6)* | Chuỗi fallback 3 cấp khi không có đội chuyên môn nào | Gửi SOS FIRE_FIGHTING khi không có bất kỳ đội PCCC nào trong toàn bộ radius_steps | Cấp 1: tìm liên tỉnh; nếu vẫn không có → Cấp 2: alert Admin; SOS vào trạng thái PENDING_SPECIALIST; không crash, không gán team_id null vào dispatch_queue |
| 17 | **Cronjob vs Handoff Race Test** *(mới ở v6)* | Quy tắc "ai lock trước thắng" ngăn gán trùng | Đội A vừa RESOLVED; Cronjob và Handoff cùng nhắm vào dòng queue của Đội A đồng thời | Chỉ 1 trong 2 thắng lock; luồng còn lại bỏ qua do `skip_locked`; ca SOS không bị xử lý 2 lần |

---

## 5. Tóm tắt Vòng đời Slot Dual Dispatch & Điểm DECR (v6)

> Bảng này thay thế hoàn toàn logic INCR/DECR Redis của v5. Với Postgres, "DECR" là DELETE dòng `dispatch_queue` có `is_dual_dispatch = true` — không có điểm nào cần nhớ gọi thủ công.

| Sự kiện kết thúc slot | Cơ chế | Hành động Postgres | Kết quả COUNT |
|:----------------------|:-------|:-------------------|:-------------:|
| Handoff thành công (Đội A nhận ca mới từ queue) | `releaseTeamAndResolveQueue` | `DELETE dispatch_queue WHERE id = nextInQueue.id` | Giảm 1 tự động |
| Escalation timeout (Cronjob xóa ca quá hạn) | Cronjob + `FOR UPDATE SKIP LOCKED` | `DELETE dispatch_queue WHERE id = expiredEntry.id` | Giảm 1 tự động |
| SOS bị hủy (CANCELLED) khi đang trong queue | Cascade từ `ON DELETE CASCADE` trên `sos_request_id` | `DELETE sos_request` → trigger xóa `dispatch_queue` | Giảm 1 tự động |
| Transaction tạo Dual Dispatch bị rollback | Postgres MVCC | INSERT chưa commit → không có dòng → COUNT không thay đổi | Không thay đổi |

---

## 6. Checklist Triển Khai Production

Trước khi đưa module Auto-dispatch v6 vào Production, nhóm kỹ thuật phải hoàn thành toàn bộ các mục sau:

**Schema & Index:**
- [ ] Tạo Functional Index `idx_rescue_team_location_geog` (nếu chưa có)
- [ ] Thêm cột `is_dual_dispatch`, `province_id` vào `dispatch_queue`
- [ ] Thêm cột `specialist_pending`, `specialist_type`, `pending_since` vào `sos_request`
- [ ] Tạo Partial Index `idx_dispatch_queue_province_dual`
- [ ] Lên kế hoạch migration `currentLocation` sang `geography(Point, 4326)` (long-term)

**Cấu hình:**
- [ ] Thiết lập `dispatch.weight_matrix` trong `system_setting`
- [ ] Thiết lập `dispatch.skill_mapping` trong `system_setting`
- [ ] Kiểm tra `dispatch.distance_delta_threshold_meters > 0`
- [ ] Thiết lập `dispatch.max_simultaneous_dual_dispatches` theo từng province
- [ ] Thiết lập `dispatch.queue_timeout_seconds`
- [ ] Thiết lập `dispatch.radius_steps`

**Testing:**
- [ ] Chạy đủ 17 test cases trong bảng mục 4
- [ ] Chạy `EXPLAIN ANALYZE` cho query không gian, xác nhận Index Scan
- [ ] Stress test concurrency với N ≥ 50 request đồng thời

**Monitoring:**
- [ ] Dashboard hiển thị `current_dual_dispatch_count` theo province (truy vấn trực tiếp từ `dispatch_queue`)
- [ ] Alert khi `specialist_pending = true` quá 15 phút
- [ ] Alert khi queue timeout escalation xảy ra

---

*Tài liệu v6 (Final) là cơ sở thiết kế đóng băng cho giai đoạn lập trình. Mọi thay đổi sau giai đoạn này phải mở phiên bản mới và ghi rõ lý do. Kiến trúc lõi đã qua 6 vòng phân tích, không còn phát sinh lỗi hổng mới về logic nghiệp vụ hoặc kiến trúc công nghệ.*
