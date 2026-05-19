# Feature: [Tên tính năng]

## 1. Nghiệp vụ
> Tóm tắt use case này làm gì. Tham chiếu mục nào trong PROJECT_RULES.md?

(Viết vào đây...)

---

## 2. API Contract

**Method & Path:**
```
[GET | POST | PUT | PATCH | DELETE] /api/v1/...
```

**Request DTO:**
```typescript
{
  // Các field cần thiết
}
```

**Response DTO:**
```typescript
{
  // Dữ liệu trả về
}
```

**HTTP Status Codes:**
| Status | Trường hợp |
|--------|------------|
| 201    |            |
| 400    |            |
| 403    |            |
| 404    |            |

---

## 3. Business Rules áp dụng

- `BR-???-??:` ...
- `BR-???-??:` ...

---

## 4. Entities / Bảng bị ảnh hưởng

**Đọc:**
- ...

**Ghi:**
- ...

---

## 5. Permissions cần thiết

- `permission:code`

---

## 6. Thứ tự implement

- [ ] Entity / Value Object — `domain/entities/`
- [ ] Interface Repository — `domain/repositories/`
- [ ] Use Case + DTO — `application/use-cases/` + `application/dtos/`
- [ ] Repository Implementation — `infrastructure/database/prisma/`
- [ ] Controller — `presentation/controllers/`
- [ ] Module Registration
- [ ] Prisma Migration
- [ ] Changelog — `openspec/changes/`

---

## 7. Edge Cases / Lưu ý đặc biệt

- ...
