# Feature: Database Seeding (Khởi tạo dữ liệu mẫu)

## 1. Nghiệp vụ (Lead Developer Mindset)
> **Tại sao cần làm tính năng này?**
> Bất kỳ hệ thống phân quyền (RBAC) hoặc hệ thống Multi-tenant (quản lý theo tỉnh/thành) nào cũng cần một tệp dữ liệu cốt lõi (Core Data) để có thể hoạt động ngay lập tức sau khi deploy mà không cần thao tác tay bằng SQL. 
> 
> **Tại sao lưu dữ liệu ra file JSON?** 
> Để tách biệt "Dữ liệu" (Data) ra khỏi "Code" (Logic). Sau này nếu Cục Cứu Hộ mở rộng thêm 10 tỉnh thành nữa, tester hoặc BA chỉ cần sửa file JSON thay vì chọc vào file `.ts`.

---

## 2. Dữ liệu JSON cần tạo (Seed Data)

**1. `provinces.json`**
Cần chuẩn bị sẵn khoảng 2-3 tỉnh để test luồng:
```json
[
  { "code": 1, "name": "Hà Nội", "shortName": "HN", "isActive": true },
  { "code": 79, "name": "Hồ Chí Minh", "shortName": "HCM", "isActive": true }
]
```

**2. `roles.json`**
Các Role cốt lõi của hệ thống:
```json
[
  { "name": "SYSTEM_ADMIN", "level": 100, "isSystem": true, "isActive": true },
  { "name": "PROVINCE_ADMIN", "level": 80, "isSystem": true, "isActive": true },
  { "name": "RESCUE_TEAM_LEADER", "level": 50, "isSystem": true, "isActive": true },
  { "name": "USER", "level": 10, "isSystem": true, "isActive": true }
]
```

---

## 3. Lựa chọn kỹ thuật (Technical Choice)

> Thay vì nhét code Seeding vào hàm `onModuleInit` (làm server chạy chậm mỗi lần restart), chúng ta sẽ tạo một **CLI Script độc lập** (ví dụ: `npm run seed`). Script này sẽ boot NestJS Context lên, chạy insert dữ liệu, rồi tự động tắt. 

### Thư viện đề xuất:
Chúng ta có thể tự viết 1 file `seed.ts` dùng trực tiếp TypeORM hoặc dùng thư viện chuyên dụng như `nestjs-command` để tạo các lệnh Terminal. 
*(Trong dự án này, để không phụ thuộc lib quá nhiều, chúng ta sẽ tự viết 1 script `src/seed.ts` đơn giản).*

---

## 4. Thứ tự implement (Implementation Order)

- [ ] 1. Tạo thư mục `src/infrastructure/database/seeds/data` và thêm các file JSON.
- [ ] 2. Viết class `SeederService` (chứa các hàm `seedProvinces()`, `seedRoles()`, `seedAdmins()`).
- [ ] 3. Hàm `seedAdmins()` sẽ tự động: 
  - Đọc các Province có sẵn.
  - Tạo 1 tài khoản `admin@system.com`.
  - Tạo các tài khoản tương ứng như `admin.hanoi@system.com`, `admin.hcm@system.com` và băm (hash) mật khẩu bằng thư viện `bcrypt`.
- [ ] 4. Tạo file entry-point `src/seed.ts`.
- [ ] 5. Thêm lệnh `"seed": "ts-node src/seed.ts"` vào `package.json`.
