# Hướng Dẫn Toàn Diện Về Cơ Chế Khóa (Locking) Trong TypeORM

Khi phát triển các ứng dụng thực tế có lượng truy cập đồng thời lớn (concurrency), việc xảy ra tranh chấp dữ liệu (Race Condition) là không tránh khỏi. 

**Ví dụ thực tế trong hệ thống cứu hộ:** 
Hai Đội trưởng A và B cùng bấm nút "Nhận cứu hộ" cho cùng một ca SOS cứu nạn tại cùng một thời điểm. Nếu không có cơ chế khóa (locking), cả hai đội đều sẽ được hệ thống báo "Nhận ca thành công", dẫn đến việc phân bổ trùng lặp, lãng phí nguồn lực trong thiên tai.

Tài liệu này sẽ trình bày chi tiết về các loại khóa, cách hoạt động, ưu nhược điểm và **cú pháp chuẩn** của chúng trong TypeORM.

---

## 1. Khóa Lạc Quan (Optimistic Lock)

### Khái niệm
Khóa lạc quan giả định rằng **xung đột dữ liệu rất hiếm khi xảy ra**. Thay vì khóa bản ghi ở tầng cơ sở dữ liệu, nó sử dụng một cột đặc biệt (thường là `version` hoặc `updateAt`) để kiểm tra xem dữ liệu có bị thay đổi bởi luồng khác kể từ lúc đọc ra hay không.

### Cách hoạt động
1. Luồng 1 đọc bản ghi `SOS (id: 1, version: 1)`.
2. Luồng 2 cũng đọc bản ghi `SOS (id: 1, version: 1)`.
3. Luồng 1 cập nhật trạng thái SOS và lưu. Cơ sở dữ liệu kiểm tra `WHERE id = 1 AND version = 1`. Cập nhật thành công, nâng `version` lên `2`.
4. Luồng 2 thực hiện cập nhật và lưu. DB chạy lệnh `WHERE id = 1 AND version = 1`. Lệnh này thất bại vì `version` hiện tại đã là `2`. TypeORM ném ra lỗi `OptimisticLockVersionMismatchError`.

### Cú pháp TypeORM (Optimistic)

#### Bước 1: Khai báo Entity với `@VersionColumn`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, VersionColumn } from 'typeorm';

@Entity('sos_request')
export class SosRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  status: string;

  // Thêm cột này để kích hoạt Khóa lạc quan tự động
  @VersionColumn()
  version: number;
}
```

#### Bước 2: Thực hiện cập nhật dữ liệu
```typescript
async claimRequest(id: number) {
  const sos = await this.sosRepo.findOneBy({ id });
  sos.status = 'DISPATCHED';
  
  try {
    // TypeORM sẽ tự động sinh câu SQL: UPDATE ... SET version = version + 1 WHERE id = :id AND version = :currentVersion
    await this.sosRepo.save(sos);
  } catch (err) {
    if (err instanceof OptimisticLockVersionMismatchError) {
      throw new BadRequestException('Dữ liệu đã bị thay đổi bởi người khác, vui lòng thử lại.');
    }
  }
}
```

---

## 2. Khóa Bi Quan (Pessimistic Lock)

### Khái niệm
Khóa bi quan giả định rằng **xung đột dữ liệu chắc chắn sẽ xảy ra**. Hệ thống sẽ khóa chặt bản ghi ngay khi đọc nó ra từ Database. Không một luồng nào khác được phép đọc (cho mục đích cập nhật) hoặc ghi đè bản ghi đó cho đến khi Transaction hiện tại kết thúc (Commit hoặc Rollback).

> [!IMPORTANT]
> Khóa bi quan **bắt buộc phải chạy bên trong một Database Transaction**. Nếu chạy ngoài Transaction, khóa sẽ tự động được giải phóng ngay sau khi câu lệnh SELECT kết thúc, làm mất tác dụng của khóa.

### Các loại Khóa bi quan trong TypeORM

#### 1. `pessimistic_read`
*   **SQL tương đương:** `SELECT ... FOR SHARE` (PostgreSQL) hoặc `LOCK IN SHARE MODE` (MySQL).
*   **Hành vi:** Cho phép các luồng khác đọc bản ghi, nhưng **chặn** không cho chúng cập nhật (Update/Delete) cho đến khi Transaction hiện tại hoàn thành.
*   **Ưu điểm:** Tốt khi bạn muốn đọc dữ liệu nhất quán để tính toán mà không lo bị luồng khác ghi đè giữa chừng.

#### 2. `pessimistic_write` (Khuyên dùng cho claim/update)
*   **SQL tương đương:** `SELECT ... FOR UPDATE`.
*   **Hành vi:** **Khóa toàn diện**. Chặn tất cả các luồng khác thực hiện đọc (có khóa) hoặc cập nhật lên bản ghi này. Luồng khác cố tình truy cập sẽ phải xếp hàng đợi (block) cho đến khi khóa được giải phóng.
*   **Ưu điểm:** Chống Race Condition tuyệt đối khi cập nhật trạng thái đơn hàng, số dư tài khoản, hoặc gán đội cứu trợ.

#### 3. `pessimistic_partial_write`
*   **SQL tương đương:** `SELECT ... FOR UPDATE SKIP LOCKED`.
*   **Hành vi:** Đọc và khóa các bản ghi chưa bị khóa, **bỏ qua (skip)** các bản ghi đang bị khóa bởi transaction khác.
*   **Ưu điểm:** Cực kỳ hữu ích cho hệ thống Hàng chờ (Message Queue / Dispatch Queue). Giúp nhiều worker cùng lấy việc mà không bị block lẫn nhau.

#### 4. `pessimistic_write_or_fail`
*   **SQL tương đương:** `SELECT ... FOR UPDATE NOWAIT`.
*   **Hành vi:** Thử khóa bản ghi. Nếu bản ghi đang bị khóa bởi transaction khác, thay vì xếp hàng chờ, nó sẽ **ném ra lỗi lập tức** để giải phóng luồng.

---

## 3. Cú Pháp Khóa Bi Quan Trong TypeORM (Quan Trọng)

TypeORM hỗ trợ 2 cách chính để sử dụng Khóa bi quan: Sử dụng **Repository API** hoặc **QueryBuilder API**.

### Cách 1: Sử dụng qua `EntityManager.findOne` (Repository API)

Bạn truyền cấu hình `lock` vào đối số thứ hai của hàm `findOne`.

```typescript
import { DataSource, EntityManager } from 'typeorm';

// Phải sử dụng manager của Transaction để duy trì trạng thái Khóa
await this.dataSource.transaction(async (manager: EntityManager) => {

  const sos = await manager.findOne(SosRequestEntity, {
    where: { id: sosId },
    // CÚ PHÁP KHÓA BI QUAN:
    lock: { mode: 'pessimistic_write' }
  });

  if (sos.status !== 'PENDING') {
    throw new BadRequestException('Yêu cầu này đã được tiếp nhận rồi!');
  }

  sos.status = 'DISPATCHED';
  sos.assignedTeamId = teamId;
  
  // Lưu lại trong phạm vi transaction
  await manager.save(SosRequestEntity, sos);
});
```

---

### Cách 2: Sử dụng qua `QueryBuilder` (Được khuyên dùng vì linh hoạt hơn)

Sử dụng phương thức `.setLock(lockMode)` và bổ sung `.setOnLocked(behavior)` nếu cần cấu hình các tùy chọn nâng cao như `SKIP LOCKED` hay `NOWAIT`.

#### 1. Cú pháp `pessimistic_write` (Khóa chờ):
```typescript
await this.dataSource.transaction(async (manager: EntityManager) => {
  const team = await manager
    .createQueryBuilder(RescueTeamEntity, 'rt')
    // CÚ PHÁP TRÊN QUERYBUILDER:
    .setLock('pessimistic_write')
    .where('rt.id = :teamId', { teamId })
    .getOne();

  // Thực hiện xử lý logic cập nhật...
});
```

#### 2. Cú pháp `SKIP LOCKED` (Bỏ qua dòng bị khóa - Dùng cho Hàng chờ):
```typescript
await this.dataSource.transaction(async (manager: EntityManager) => {
  const nextJob = await manager
    .createQueryBuilder(DispatchQueueEntity, 'dq')
    .setLock('pessimistic_write')
    // CÚ PHÁP BỎ QUA DÒNG BỊ KHÓA:
    .setOnLocked('skip_locked') 
    .where('dq.provinceId = :provinceId', { provinceId })
    .orderBy('dq.priorityScore', 'DESC')
    .getOne();

  if (nextJob) {
    // Xử lý Job này mà không lo đụng độ với Worker khác chạy song song
  }
});
```

#### 3. Cú pháp `NOWAIT` (Lỗi ngay nếu bị khóa):
```typescript
await this.dataSource.transaction(async (manager: EntityManager) => {
  try {
    const account = await manager
      .createQueryBuilder(AccountEntity, 'acc')
      .setLock('pessimistic_write')
      // CÚ PHÁP NÉM LỖI NGAY NẾU ĐANG BỊ KHÓA:
      .setOnLocked('nowait') 
      .where('acc.id = :id', { id })
      .getOne();
  } catch (err) {
    // Sẽ nhảy vào đây ngay lập tức nếu dòng này đang bị transaction khác giữ khóa
    throw new BadRequestException('Tài khoản đang được xử lý giao dịch khác, vui lòng thử lại sau.');
  }
});
```

---

## 4. Bảng Tổng Hợp So Sánh Lựa Chọn

| Kịch bản nghiệp vụ | Loại Khóa đề xuất | Lý do chọn |
| :--- | :--- | :--- |
| **Đăng ký tài khoản, sửa thông tin cá nhân Profile** | **Không dùng khóa** hoặc **Khóa Lạc Quan** | Tần suất cập nhật đồng thời rất thấp, dùng khóa bi quan sẽ làm chậm hệ thống không đáng có. |
| **Đội nhận SOS cứu trợ, trừ tiền tài khoản, đặt chỗ rạp phim** | **Khóa Bi Quan (`pessimistic_write`)** | Yêu cầu tính nhất quán tuyệt đối, không được phép xảy ra trùng lặp/sai sót số dư. |
| **Worker lấy nhiệm vụ từ hàng chờ xử lý để chạy nền** | **Khóa Bi Quan (`pessimistic_write` + `skip_locked`)** | Tránh tình trạng nhiều worker xử lý trùng lặp 1 task, đồng thời đảm bảo không bị block xếp hàng làm giảm throughput. |

---

## 5. Lưu Ý Quan Trọng Khi Đi Làm Thực Tế (Best Practices)

1.  **Chỉ sử dụng khóa trên các cột có INDEX:**
    Khi bạn thực hiện khóa `FOR UPDATE` (Pessimistic Write) kèm điều kiện `WHERE`, cơ sở dữ liệu (Postgres/MySQL) yêu cầu cột trong `WHERE` phải được đánh Index. Nếu không có Index, DB sẽ quét toàn bộ bảng và nâng cấp từ **Khóa dòng (Row Lock)** lên **Khóa bảng (Table Lock)**. Điều này sẽ làm toàn bộ ứng dụng bị tê liệt.
2.  **Giữ thời gian chạy Transaction cực ngắn:**
    Hãy thực hiện tất cả các thao tác tính toán, gọi API bên thứ ba (như ORS Map) **ở ngoài** transaction. Chỉ mở transaction tại bước cuối cùng khi cần đọc-khóa-ghi dữ liệu vào DB. Transaction kéo dài quá lâu sẽ dễ gây ra lỗi **Deadlock** (khóa vòng chéo lẫn nhau).
