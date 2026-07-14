-- =====================================================================
-- SCRIPT TẠO 50 USER ẢO (dữ liệu giả lập) - provinceId = 2
-- Mật khẩu mặc định cho tất cả: 123456
-- Role gán mặc định: RESIDENT (roleId = 4)
-- Chạy trên PostgreSQL (dùng CTE + RETURNING để lấy id vừa tạo)
-- =====================================================================

BEGIN;

WITH source AS (
  SELECT
    gs AS n,
    -- Danh sách họ (18 họ phổ biến VN)
    (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng',
           'Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Trịnh'])[1 + (gs % 18)] AS ho,
    -- Tên đệm
    (ARRAY['Văn','Thị','Hữu','Thành','Minh','Ngọc','Xuân','Đức','Anh','Quang'])[1 + (gs % 10)] AS dem,
    -- Tên
    (ARRAY['An','Bình','Chi','Dũng','Hà','Hải','Hùng','Hương','Khoa','Lan',
           'Linh','Long','Mai','Nam','Nga','Phúc','Quân','Quyên','Sơn','Thảo',
           'Thịnh','Trang','Trung','Tuấn','Tú','Vy','Yến','Đạt','Đông','Đăng',
           'Kiên','Loan','My','Nhi','Oanh','Phong','Phương','Quỳnh','Thắng','Thúy',
           'Tiến','Toàn','Trâm','Trinh','Trường','Tùng','Uyên','Việt','Vinh','Vũ'])[1 + ((gs*7) % 50)] AS ten,
    CASE WHEN gs % 2 = 0 THEN 'MALE'::user_gender_enum ELSE 'FEMALE'::user_gender_enum END AS gioitinh
  FROM generate_series(1, 50) AS gs
),
inserted AS (
  INSERT INTO "user" (
    "provinceId",
    "fullName",
    "nationalId",
    "nationalIdVerified",
    "dateOfBirth",
    "gender",
    "phone",
    "phoneVerified",
    "email",
    "emailVerified",
    "password",
    "isVerified",
    "isActive",
    "isVolunteer",
    "trustScore"
  )
  SELECT
    2 AS "provinceId",                                                  -- provinceId cố định = 2
    ho || ' ' || dem || ' ' || ten AS "fullName",                       -- Họ tên đầy đủ giả lập
    '079' || lpad((200000000 + n)::text, 9, '0') AS "nationalId",       -- CCCD giả, duy nhất
    true AS "nationalIdVerified",
    ('1990-01-01'::date + ((n * 137) % 10000) * interval '1 day') AS "dateOfBirth", -- DOB rải rác
    gioitinh AS "gender",
    '09' || lpad((80000000 + n)::text, 8, '0') AS "phone",              -- SĐT giả, duy nhất
    true AS "phoneVerified",
    'user' || n || '.demo@example.com' AS "email",                     -- Email giả, duy nhất
    true AS "emailVerified",
    '$2b$10$OJjhWc7UM2nRGe2n1tf/Qe2c83AA8xxC13sKICbjToMsKjrVO.Eya' AS "password", -- Hash của "123456"
    true AS "isVerified",
    true AS "isActive",
    false AS "isVolunteer",
    (50 + (n % 40))::float AS "trustScore"                              -- Điểm tin cậy 50-89
  FROM source
  RETURNING id
)
-- Gán role RESIDENT (roleId = 9) cho toàn bộ 50 user vừa tạo
INSERT INTO "user_role" (
  "userId",
  "roleId",
  "provinceId",
  "isActive"
)
SELECT
  id,
  9,   -- roleId = 9 (RESIDENT)
  2,   -- provinceId = 2 (khớp với user)
  true
FROM inserted;

COMMIT;

-- =====================================================================
-- GHI CHÚ:
-- 1. Toàn bộ 50 user có provinceId = 2.
-- 2. Mật khẩu cho tất cả: 123456 (đã hash sẵn bằng Bcrypt).
-- 3. nationalId và phone được sinh tự động để đảm bảo không trùng nhau
--    (nationalId bắt đầu từ 079200000001, phone bắt đầu từ 0980000001...).
-- 4. Nếu muốn gán role khác (VD: VOLUNTEER = 5) thay số "4" ở phần
--    INSERT INTO "user_role" thành roleId mong muốn.
-- 5. Nếu chạy trên MySQL/MariaDB thay vì PostgreSQL, cú pháp CTE
--    "INSERT ... RETURNING" không được hỗ trợ trực tiếp - cần tách
--    thành 2 bước (insert user trước, sau đó insert user_role dựa
--    trên khoảng ID vừa sinh, ví dụ dùng LAST_INSERT_ID()).
-- =====================================================================
