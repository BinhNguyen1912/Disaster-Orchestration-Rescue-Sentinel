-- Functional Index cho PostGIS geography cast
CREATE INDEX IF NOT EXISTS idx_rescue_team_location_geog
  ON rescue_team USING gist ((("currentLocation")::geography));

-- Partial Index cho Dual Dispatch quota counting
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_province_dual
  ON dispatch_queue("provinceId", "isDualDispatch")
  WHERE "isDualDispatch" = true;

-- Composite index cho queue resolution
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_team_priority
  ON dispatch_queue("teamId", "priorityScore" DESC, "queuedAt" ASC);

-- Enum migration (chạy 1 lần)
ALTER TYPE sos_request_status_enum ADD VALUE IF NOT EXISTS 'PENDING_SPECIALIST';
ALTER TYPE rescue_team_status_enum ADD VALUE IF NOT EXISTS 'DISPATCHED';
