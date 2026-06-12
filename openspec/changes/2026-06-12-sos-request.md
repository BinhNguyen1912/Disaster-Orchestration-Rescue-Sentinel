# Changelog: SOS Request Module

## Date: 2026-06-12

### Added
- Created `SosRequestModule` including the core CRUD endpoints and workflows.
- Exposed:
  - `POST /api/v1/sos-requests` - Public SOS request creation (guests require name/phone & image attachment).
  - `GET /api/v1/sos-requests` - Scoped queries based on tenant & role permissions.
  - `GET /api/v1/sos-requests/nearby` - PostGIS-based spatial search.
  - `PATCH /api/v1/sos-requests/:id/status` - Lifecycle transition.
  - `PATCH /api/v1/sos-requests/:id/assign` - Team allocation (manual/auto matchmaking).
  - `DELETE /api/v1/sos-requests/:id` - Self-cancellation and resource release.
- Implemented `DistanceBasedDispatchStrategy` using PostGIS `ST_Distance` to find nearest available rescue team.
- Defined domain entities, application DTOs, consolidated `SosRequestService` class, controller, and infrastructure repositories.

### Modified
- Modified `SosRequestEntity` schema to support nullable `requesterId` and optional guest fields `requesterName` & `requesterPhone`.
- Added `findNearestAvailable` to `RescueTeamRepository` using PostGIS.
- Registered `SosRequestModule` in `AppModule`.
