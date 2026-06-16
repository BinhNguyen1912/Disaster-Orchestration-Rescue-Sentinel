# OpenSpec: Media Storage Integration (Rescue Team & SOS Request)

## 1. Business Description
This specification outlines the standardization and enhancement of media file reference handling for both the `SosRequest` and `RescueTeam` modules.
- **SOS Request**: Correct the data type mismatch for `imageUrls` between TypeScript/TypeORM entities and PostgreSQL database arrays (`varchar[]`).
- **Rescue Team**: Add a new `logoUrl` field for storing the team logo. If no logo is uploaded by the user, the backend will dynamically fall back to a default team logo based on the team's type (`TeamType`).

---

## 2. API Contract

### 2.1. Create/Update Rescue Team (Payloads)
Endpoints:
- `POST /rescue-teams`
- `PATCH /rescue-teams/:teamId`

Payload:
```json
{
  "name": "Đội PCCC Hà Nội",
  "teamType": "PCCC",
  "provinceId": 1,
  "adminUnitId": 12,
  "logoUrl": "https://pub-r2.dev/rescue-teams/logo-123.jpg" // [NEW] Optional field
}
```

### 2.2. Get Rescue Team Response
Endpoints:
- `GET /rescue-teams`
- `GET /rescue-teams/:teamId`

Response DTO:
```json
{
  "id": 1,
  "name": "Đội PCCC Hà Nội",
  "teamType": "PCCC",
  "status": "AVAILABLE",
  "logoUrl": "https://pub-r2.dev/rescue-teams/logo-123.jpg" // Custom URL or Default fallback
}
```

---

## 3. Business Rules Applied
- `BR-MEDIA-01`: Team logo (`logoUrl`) is optional during creation and update.
- `BR-MEDIA-02`: Default fallback logo logic for `RescueTeam`. If `logoUrl` is not provided (or is null), the API returns a default logo URL mapping to the team's `teamType` fetched from `.env` via `ConfigService`:
  - `PCCC` ➡️ Loaded from `DEFAULT_LOGO_PCCC`
  - `Y_TE` ➡️ Loaded from `DEFAULT_LOGO_YTE`
  - `VOLUNTEER` / `VOLUNTEER_SPONTANEOUS` ➡️ Loaded from `DEFAULT_LOGO_VOLUNTEER`
  - All other types / fallback ➡️ Loaded from `DEFAULT_LOGO_GENERAL`
- `BR-MEDIA-03`: `SosRequest` imageUrls must be validated and stored as a strict array of strings (`string[]`).

---

## 4. Entities / Columns Affected

### `rescue_team` Table
- Add `logo_url` column: `VARCHAR(500) NULL`

### `sos_request` Table
- Standardize `image_urls` type mismatch: Ensure it maps to TypeORM `string[]` (PostgreSQL `varchar[]` array).

---

## 5. Permissions Required
No new permissions are required. Existing permissions apply:
- `rescue_team:create` / `rescue_team:update` / `rescue_team:read`
- `sos_request:create` / `sos_request:read`

---

## 6. Implementation Order
1. **Modify Database Entities**:
   - `RescueTeamEntity`: Add `logoUrl` field.
   - `SosRequestEntity`: Fix `imageUrls` type definition to `string[]`.
2. **Modify Domain & DTOs**:
   - Update `RescueTeam` interface.
   - Update Create/Update Validation DTOs and Application DTOs.
   - Update `RescueTeamResponseDto` to include `logoUrl` and mapping logic.
3. **Modify Service Mapping / Fallback Logic**:
   - Apply fallback logic when serializing the rescue team response.
4. **Database Migration**:
   - Create a TypeORM migration script to add `logo_url` column and run it.
5. **Verify**:
   - Run e2e tests and verify locally.
