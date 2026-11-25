ALTER TABLE "job_cards"
ADD COLUMN IF NOT EXISTS "status_version" integer NOT NULL DEFAULT 0;
