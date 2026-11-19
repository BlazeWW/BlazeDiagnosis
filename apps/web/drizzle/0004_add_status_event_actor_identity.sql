ALTER TABLE "job_status_events"
ADD COLUMN IF NOT EXISTS "actor_identity" text;
