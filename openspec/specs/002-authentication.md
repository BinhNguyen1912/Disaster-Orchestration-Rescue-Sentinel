# Authentication Module

## 1. Overview
This module handles user authentication, issuing JSON Web Tokens (JWT) for secure API access.

## 2. API Endpoints

### 2.1. Đăng nhập (Login)
- **Endpoint**: `POST /auth/login`
- **Description**: Authenticates a user using either their phone number or email address.
- **Authentication**: None (Public)

#### Request Payload
```json
{
  "identifier": "0901234567", // Có thể là số điện thoại HOẶC email (ví dụ: admin.hanoi@system.com)
  "password": "Password123"
}
```

#### Responses

**200 OK (Thành công)**
```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "fullName": "Admin Hà Nội",
      "email": "admin.hanoi@system.com",
      "phone": "0900000001",
      "provinceId": 1
    }
  }
}
```

**400 Bad Request (Thiếu/Sai định dạng)**
```json
{
  "statusCode": 400,
  "message": [
    "identifier must be a string",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

**401 Unauthorized (Sai thông tin đăng nhập)**
```json
{
  "statusCode": 401,
  "message": "Thông tin đăng nhập không hợp lệ",
  "error": "Unauthorized"
}
```

## 3. JWT Payload Structure
Khi giải mã JWT, hệ thống sẽ có các thông tin sau:
```json
{
  "sub": 1,             // User ID
  "provinceId": 1,      // ID của tỉnh thành (nếu có)
  "roleId": 1,
  "fullName": "Admin Hà Nội",
  "email": "admin.hanoi@system.com",
  "iat": 1684490000,    // Thời gian phát hành
  "exp": 1684576400     // Thời gian hết hạn
}
```
*Lưu ý: Các Role cụ thể sẽ được query trực tiếp từ Database trong các Guard thay vì nhét hết vào JWT để tránh payload quá to và đảm bảo quyền hạn được update realtime.*
