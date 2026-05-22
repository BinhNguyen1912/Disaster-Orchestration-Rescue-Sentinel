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
  "sub": 1, // User ID
  "provinceId": 1, // ID của tỉnh thành (nếu có)
  "roleId": 1,
  "fullName": "Admin Hà Nội",
  "email": "admin.hanoi@system.com",
  "iat": 1684490000, // Thời gian phát hành
  "exp": 1684576400 // Thời gian hết hạn
}
```

_Lưu ý: Các Role cụ thể sẽ được query trực tiếp từ Database trong các Guard thay vì nhét hết vào JWT để tránh payload quá to và đảm bảo quyền hạn được update realtime._

---

## 4. API Endpoints Bổ sung

### 4.1. Đăng ký (Register)

- **Endpoint**: `POST /auth/register`
- **Description**: Tạo tài khoản người dùng mới. Mặc định tài khoản tạo ra sẽ có trạng thái kích hoạt và được gán vai trò tương ứng với tỉnh thành được chọn.
- **Authentication**: None (Public)

#### Request Payload

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0987654321",
  "email": "nguyenvana@gmail.com",
  "password": "Password123!",
  "provinceId": 1,
  "dateOfBirth": "2000-01-01T00:00:00.000Z",
  "gender": "MALE", // MALE, FEMALE, OTHER
  "nationalId": "012345678901"
}
```

#### Responses

**201 Created (Thành công)**

```json
{
  "statusCode": 201,
  "message": "Đăng ký tài khoản thành công",
  "data": {
    "id": 2,
    "fullName": "Nguyễn Văn A",
    "email": "nguyenvana@gmail.com",
    "phone": "0987654321",
    "provinceId": 1
  }
}
```

**400 Bad Request (Dữ liệu không hợp lệ hoặc Số điện thoại/Email/CCCD đã tồn tại)**

```json
{
  "statusCode": 400,
  "message": "Số điện thoại hoặc Email hoặc CCCD đã được sử dụng",
  "error": "Bad Request"
}
```

---

### 4.2. Cấp lại Access Token (Refresh Token)

- **Endpoint**: `POST /auth/refresh`
- **Description**: Sử dụng Refresh Token còn hạn để nhận Access Token mới và Refresh Token mới (áp dụng cơ chế Rotate Refresh Token để tăng tính bảo mật).
- **Authentication**: None (Public - gửi Token trong Body)

#### Request Payload

```json
{
  "refreshToken": "uuid-or-jwt-refresh-token-string"
}
```

#### Responses

**200 OK (Thành công)**

```json
{
  "statusCode": 200,
  "message": "Cấp lại token thành công",
  "data": {
    "accessToken": "new-eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "new-uuid-or-jwt-refresh-token-string"
  }
}
```

**401 Unauthorized (Token hết hạn, không hợp lệ hoặc đã bị thu hồi)**

```json
{
  "statusCode": 401,
  "message": "Refresh token không hợp lệ hoặc đã hết hạn",
  "error": "Unauthorized"
}
```

---

### 4.3. Đăng xuất (Logout)

- **Endpoint**: `POST /auth/logout`
- **Description**: Thu hồi (revoke) Refresh Token hiện tại để đăng xuất khỏi thiết bị.
- **Authentication**: Bearer JWT (Yêu cầu gửi Access Token ở Header để định danh)

#### Request Payload

```json
{
  "refreshToken": "uuid-or-jwt-refresh-token-string"
}
```

#### Responses

**200 OK (Thành công)**

```json
{
  "statusCode": 200,
  "message": "Đăng xuất thành công",
  "data": null
}
```

---

### 4.4. Yêu cầu lấy lại mật khẩu (Forgot Password)

- **Endpoint**: `POST /auth/forgot-password`
- **Description**: Yêu cầu mã OTP khôi phục mật khẩu gửi qua Email/Số điện thoại.
- **Authentication**: None (Public)

#### Request Payload

```json
{
  "identifier": "nguyenvana@gmail.com" // Email hoặc số điện thoại
}
```

#### Responses

**200 OK (Thành công)**

```json
{
  "statusCode": 200,
  "message": "Mã OTP khôi phục mật khẩu đã được gửi",
  "data": {
    "resetToken": "temp-token-for-reset-step" // Token tạm thời để định danh phiên reset
  }
}
```

---

### 4.5. Đặt lại mật khẩu (Reset Password)

- **Endpoint**: `POST /auth/reset-password`
- **Description**: Xác nhận OTP và đặt lại mật khẩu mới.
- **Authentication**: None (Public)

#### Request Payload

```json
{
  "resetToken": "temp-token-for-reset-step",
  "otp": "123456",
  "newPassword": "NewPassword123!"
}
```

#### Responses

**200 OK (Thành công)**

```json
{
  "statusCode": 200,
  "message": "Đặt lại mật khẩu thành công",
  "data": null
}
```

**400 Bad Request (OTP sai hoặc hết hạn)**

```json
{
  "statusCode": 400,
  "message": "Mã OTP không hợp lệ hoặc đã hết hạn",
  "error": "Bad Request"
}
```

---

## 5. Cơ cấu Bảng dữ liệu Refresh Token (Database Schema)

Bảng `refresh_token` sẽ lưu trữ trạng thái đăng nhập để quản lý phiên (Session):

| Trường (Field) | Kiểu dữ liệu (Type)        | Mô tả                                               |
| -------------- | -------------------------- | --------------------------------------------------- |
| `id`           | `INT` (PK, Auto Increment) | ID tự tăng                                          |
| `token`        | `VARCHAR` (Unique, Index)  | Refresh Token (UUID hoặc chuỗi ngẫu nhiên mã hóa)   |
| `userId`       | `INT` (FK)                 | Liên kết tới bảng `user`                            |
| `expiresAt`    | `TIMESTAMP`                | Thời gian hết hạn của token                         |
| `isRevoked`    | `BOOLEAN` (Default: false) | Trạng thái bị thu hồi (sau khi dùng hoặc đăng xuất) |
| `createdAt`    | `TIMESTAMP` (Default: NOW) | Thời điểm tạo                                       |
