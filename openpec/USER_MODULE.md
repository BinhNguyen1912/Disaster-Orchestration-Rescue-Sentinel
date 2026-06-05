# User Module Specification

## Overview
Create a standalone `UserModule` for citizen and staff user management in the disaster rescue system.

## Module Structure
```
src/modules/user/
├── application/
│   ├── dtos/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   ├── query-user.dto.ts
│   │   └── change-password.dto.ts
│   ├── interfaces/
│   │   └── user.service.interface.ts
│   └── services/
│       └── user.service.ts
├── domain/
│   ├── entities/
│   │   └── user.entity.ts (domain entity)
│   └── repositories/
│       └── user.repository.interface.ts
├── infrastructure/
│   └── persistence/
│       └── repositories/
│           └── user.repository.ts
├── presentation/
│   ├── controllers/
│   │   └── user.controller.ts
│   └── dtos/
│       └── validation/
│           ├── create-user.validation.dto.ts
│           ├── update-user.validation.dto.ts
│           └── query-user.validation.dto.ts
└── user.module.ts
```

## User Entity Fields
- `id` - Primary key
- `provinceId` - Required, link to province
- `adminUnitId` - Optional, link to administrative unit
- `fullName` - Required
- `nationalId` - Required, unique
- `nationalIdVerified` - Boolean, default false
- `dateOfBirth` - Required
- `gender` - Enum (MALE, FEMALE, OTHER)
- `phone` - Required, unique
- `phoneVerified` - Boolean, default false
- `email` - Optional, unique
- `emailVerified` - Boolean, default false
- `password` - Hashed password
- `avatarUrl` - Optional
- `nationalIdFrontUrl` - Optional
- `nationalIdBackUrl` - Optional
- `addressDetail` - Optional
- `homeLocation` - Geometry point
- `currentLocation` - Geometry point
- `trustScore` - Float, default 0
- `isVerified` - Boolean
- `isActive` - Boolean
- `lastSeenAt` - Optional timestamp
- `deletedAt` - Soft delete timestamp
- `passwordResetOtp` - Optional
- `passwordResetOtpExpires` - Optional
- `passwordResetToken` - Optional

## API Endpoints

### Base Path: `/users`

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| GET | `/users` | List all users (paginated) | Required | USER_READ |
| GET | `/users/:id` | Get user by ID | Required | USER_READ |
| GET | `/users/profile` | Get current user profile | Required | - |
| PATCH | `/users/profile` | Update current user profile | Required | - |
| PATCH | `/users/:id` | Update user by ID | Required | USER_UPDATE |
| DELETE | `/users/:id` | Soft delete user | Required | USER_DELETE |
| PATCH | `/users/:id/status` | Activate/Deactivate user | Required | USER_MANAGE |
| PATCH | `/users/:id/password` | Change user password (admin) | Required | USER_MANAGE |
| POST | `/users/:id/verify-phone` | Send phone verification | Required | - |
| POST | `/users/:id/verify-email` | Send email verification | Required | - |
| GET | `/users/search` | Search users by name/phone/email | Required | USER_READ |

## Query Parameters for GET /users
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `provinceId` - Filter by province
- `isActive` - Filter by active status
- `isVerified` - Filter by verification status
- `search` - Search by name, phone, email, nationalId
- `roleId` - Filter by role

## DTOs

### CreateUserDto
```typescript
{
  provinceId: number;
  adminUnitId?: number;
  fullName: string;
  nationalId: string;
  dateOfBirth: string; // ISO date
  gender: Gender;
  phone: string;
  email?: string;
  password: string;
}
```

### UpdateUserDto
```typescript
{
  fullName?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  nationalIdFrontUrl?: string;
  nationalIdBackUrl?: string;
  addressDetail?: string;
  homeLocation?: GeoJSON.Point;
}
```

### ChangePasswordDto
```typescript
{
  currentPassword?: string; // Required for self change
  newPassword: string;
}
```

### QueryUserDto
```typescript
{
  page?: number;
  limit?: number;
  provinceId?: number;
  adminUnitId?: number;
  isActive?: boolean;
  isVerified?: boolean;
  roleId?: number;
  search?: string;
}
```

## Permissions
- `USER_READ` - View users
- `USER_CREATE` - Create users
- `USER_UPDATE` - Update users
- `USER_DELETE` - Delete users
- `USER_MANAGE` - Manage user status/password

## User Types
1. **Citizen** - Registered via `/auth/register`, limited profile access
2. **Staff** - Created by admin via `/auth/admin/register`, full access based on roles
3. **System Admin** - Full system access

## Implementation Notes
- Use existing `UserEntity` from infrastructure
- User repository should extend BaseRepository
- Soft delete pattern for DELETE endpoint
- Profile endpoints use `req.user.userId` from JWT
- Password changes require validation
