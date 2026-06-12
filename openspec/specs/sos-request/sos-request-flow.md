# Feature: SOS Request Lifecycle & Dispatching

## Business Description
This module manages SOS emergency requests from residents (both registered and guests). It captures request types, locations (PostGIS Points), severity, and images, and manages their dispatch to available rescue teams.

References:
- `be/docs/SOS_REQUEST_MODULE.md`
- `be/docs/PROJECT_RULES.md` (Sections 4, 16.2, 16.3, 16.4)

## API Contract

### 1. Create SOS Request (Public)
- **Method:** `POST`
- **Path:** `/api/v1/sos-requests`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "requesterName": "Nguyễn Văn A", // required if guest
    "requesterPhone": "0917234567", // required if guest
    "requestType": "FLOOD",
    "latitude": 10.7589,
    "longitude": 106.7004,
    "description": "Nước dâng cao ngập tầng trệt",
    "severity": "HIGH",
    "provinceId": 1,
    "adminUnitId": 12,
    "trappedPeopleCount": 3,
    "specialNeedsTags": ["ELDERLY"],
    "imageUrls": ["https://storage.rescue.gov.vn/sos/img.jpg"]
  }
  ```
- **Response (201 Created)**

### 2. Query SOS Requests
- **Method:** `GET`
- **Path:** `/api/v1/sos-requests`
- **Auth:** Requires JWT & `sos:read` permission.
- **Query Params:** `provinceId`, `status`, `requestType`, `severity`, `assignedTeamId`, `page`, `limit`.
- **Response (200 OK):** Paginated list of requests.

### 3. Find Nearby SOS Requests
- **Method:** `GET`
- **Path:** `/api/v1/sos-requests/nearby`
- **Auth:** Requires JWT & `sos:read` permission.
- **Query Params:** `lat` (number), `lng` (number), `radius` (number, default: 5), `status` (default: PENDING).
- **Response (200 OK):** List of SOS requests with `distance_km`.

### 4. Update SOS Request Status
- **Method:** `PATCH`
- **Path:** `/api/v1/sos-requests/:id/status`
- **Auth:** Requires JWT & `sos:update` permission.
- **Request Body:**
  ```json
  {
    "status": "ON_SITE",
    "resolutionNotes": "Đã tiếp cận hiện trường"
  }
  ```
- **Response (200 OK)**

### 5. Assign Rescue Team
- **Method:** `PATCH`
- **Path:** `/api/v1/sos-requests/:id/assign`
- **Auth:** Requires JWT & `sos:update` permission.
- **Request Body:**
  ```json
  {
    "teamId": 32 // Optional. If absent, triggers IDispatchStrategy
  }
  ```
- **Response (200 OK)**

### 6. Self-cancel SOS Request
- **Method:** `DELETE`
- **Path:** `/api/v1/sos-requests/:id`
- **Auth:** Requires JWT (owner) or public if created anonymously (validated via phone matching/requesterPhone check).
- **Request Body:**
  ```json
  {
    "reason": "Gia đình đã tự di chuyển an toàn"
  }
  ```
- **Response (200 OK)**

## Business Rules Applied
- `BR-SOS-01`: Valid GPS latitude and longitude.
- `BR-SOS-02`: Mandatory image check if unverified or guest.
- `BR-SOS-05`: Rate limit guest requests (3 requests in 10 minutes per IP).
- `BR-TENANT-01` / `BR-TENANT-02`: Scoped access by `provinceId` unless `SUPER_ADMIN`.
- `BR-DISPATCH-01`: Assign only to `AVAILABLE` or `STANDBY` teams.
- `BR-DISPATCH-02`: Score strategy matching distance, workload, and skills.
- Self-cancellation releases team: Set team back to `AVAILABLE`.

## Entities Affected
- `SosRequestEntity` (Write)
- `RescueTeamEntity` (Read/Write)
- `UserEntity` (Read)

## Permissions Required
- `sos:create`
- `sos:read`
- `sos:update`
- `sos:delete`

## Implementation Order
1. Domain entity `SosRequest` & Repository interface `ISosRequestRepository`.
2. Application DTOs & Use cases.
3. Strategy pattern interfaces & implementation.
4. Infrastructure Repository implementation mapping to TypeORM.
5. Presentation Controller & Module wiring.
