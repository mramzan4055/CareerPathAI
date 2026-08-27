-- =============================================================================
-- CareerPath AI — v2.1 Zero-Cost Edition Database Migration
-- =============================================================================
-- Run this file against your Supabase PostgreSQL database to upgrade the schema
-- for v2.1. All statements use IF NOT EXISTS / IF EXISTS guards so the script
-- is idempotent — safe to run multiple times.
--
-- Apply order matters; run the entire file in one transaction if possible:
--   psql $DATABASE_URL -f migrations/v2_1_zero_cost.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. JOBS TABLE — add multi-source columns
-- ---------------------------------------------------------------------------

-- source column: tracks which connector ingested the row
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source VARCHAR(64) DEFAULT 'adzuna';

-- external_id: SHA-256 fingerprint for deduplication across sources
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(64);

-- remote flag
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS remote BOOLEAN DEFAULT FALSE;

-- tags: array of skill/category tags from source APIs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- published_at: original posting date from source
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Unique index for upsert-on-conflict deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_id
  ON jobs (external_id)
  WHERE external_id IS NOT NULL;

-- General-purpose index for filtering by source
CREATE INDEX IF NOT EXISTS idx_jobs_source
  ON jobs (source);

-- Index for remote-only queries
CREATE INDEX IF NOT EXISTS idx_jobs_remote
  ON jobs (remote)
  WHERE remote = TRUE;

-- Index for recency queries
CREATE INDEX IF NOT EXISTS idx_jobs_created_at
  ON jobs (created_at DESC);

-- Backfill existing Adzuna rows with a deterministic external_id so they are
-- not duplicated on future Adzuna syncs.
UPDATE jobs
SET external_id = encode(sha256((COALESCE(adzuna_id, '') || '|adzuna')::bytea), 'hex')
WHERE external_id IS NULL
  AND adzuna_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. PROFILES TABLE — add application preference columns
-- ---------------------------------------------------------------------------

-- Daily application limit (enforced by Application Assistant router)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_apply_limit INTEGER DEFAULT 10;

-- Notification preferences stored as JSONB
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{
    "match_alerts": true,
    "application_reminders": true,
    "weekly_digest": true,
    "email_notifications": false
  }'::jsonb;

-- Account deletion requested flag (soft-delete for GDPR flows)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE;

-- ---------------------------------------------------------------------------
-- 3. AUDIT_LOG TABLE — Application Assistant audit trail
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        VARCHAR(64) NOT NULL,   -- e.g. 'apply_intent', 'status_change', 'data_export'
  entity_type   VARCHAR(64),            -- e.g. 'job_application', 'profile'
  entity_id     UUID,                   -- id of the affected row
  details       JSONB DEFAULT '{}'::jsonb,
  ip_address    INET,                   -- optional, set by backend when available
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log (action);

-- RLS: users see only their own audit entries; service role sees all
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own audit log."
  ON audit_log FOR SELECT
  USING ( auth.uid() = user_id );

-- Inserts come exclusively from the backend service-role key (bypasses RLS)

-- ---------------------------------------------------------------------------
-- 4. JOB_APPLICATIONS TABLE — Application Assistant tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  -- Denormalised snapshot so the card renders even if the job is deleted
  job_title       TEXT NOT NULL,
  company         TEXT NOT NULL,
  job_url         TEXT,
  source          VARCHAR(64) DEFAULT 'manual',
  status          VARCHAR(32) NOT NULL DEFAULT 'applied'
                  CHECK (status IN ('applied','interviewing','offer','rejected','withdrawn')),
  consent_given   BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  applied_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user_id
  ON job_applications (user_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_applications_status
  ON job_applications (user_id, status);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own applications."
  ON job_applications FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY IF NOT EXISTS "Users can insert own applications."
  ON job_applications FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY IF NOT EXISTS "Users can update own applications."
  ON job_applications FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY IF NOT EXISTS "Users can delete own applications."
  ON job_applications FOR DELETE
  USING ( auth.uid() = user_id );

-- ---------------------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE — In-app notification system
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        VARCHAR(64) NOT NULL,  -- 'match_alert', 'reminder', 'system', 'digest'
  title       TEXT NOT NULL,
  body        TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own notifications."
  ON notifications FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY IF NOT EXISTS "Users can update own notifications."
  ON notifications FOR UPDATE
  USING ( auth.uid() = user_id );

-- Service-role key handles inserts; no anon insert policy intentionally.

-- ---------------------------------------------------------------------------
-- 6. DATA_EXPORT_REQUESTS TABLE — GDPR download-my-data tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS data_export_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       VARCHAR(32) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'ready', 'expired', 'failed')),
  download_url TEXT,                -- signed URL populated when status = 'ready'
  expires_at   TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id
  ON data_export_requests (user_id, created_at DESC);

ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own export requests."
  ON data_export_requests FOR SELECT
  USING ( auth.uid() = user_id );

-- ---------------------------------------------------------------------------
-- 7. Helper function — auto-update updated_at on job_applications
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_applications_updated_at ON job_applications;
CREATE TRIGGER trg_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 8. Saved jobs table — ensure status column exists (Phase 2 backfill)
-- ---------------------------------------------------------------------------

ALTER TABLE saved_jobs
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'saved'
  CHECK (status IN ('saved','applied','interviewing','offer','rejected','withdrawn'));

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
-- Tables created:   audit_log, job_applications, notifications, data_export_requests
-- Tables altered:   jobs (+source, +external_id, +remote, +tags, +published_at)
--                   profiles (+daily_apply_limit, +notification_prefs, +deletion_requested_at)
--                   saved_jobs (+status, if missing)
-- Indexes added:    9 new indexes
-- RLS policies:     4 new tables protected
-- =============================================================================

COMMIT;
