-- Add patient-scoped assignment status and effective dates to patient_programs
--
-- This migration adds:
-- 1. assignment_status: patient-scoped program status (active/inactive/on_hold/as_needed)
-- 2. effective_start_date: when the assignment became active (nullable)
-- 3. effective_end_date: when the assignment stops (nullable)
-- 4. check constraint: effective_start_date <= effective_end_date
--
-- Backfill logic (driven by exercises.lifecycle_status only — no archived_at flag):
-- - deprecated exercises: rows deleted (deprecated programs do not carry over)
-- - archived  exercises: assignment_status = 'inactive'
-- - on_hold   exercises: assignment_status = 'on_hold'
-- - as_needed exercises: assignment_status = 'as_needed'
-- - active    exercises: assignment_status = 'active' (column default)
--
-- Global exercise lifecycle_status is the sole source of truth for this backfill.
-- Going forward, patient-scoped assignment_status is managed independently via the
-- batch assignment UI; resolveEffectiveStatus enforces the hard floor at read time.

ALTER TABLE "public"."patient_programs"
  ADD COLUMN "assignment_status" text DEFAULT 'active' NOT NULL
    CONSTRAINT "patient_programs_assignment_status_check" CHECK (
      "assignment_status" = ANY (ARRAY['active', 'inactive', 'on_hold', 'as_needed'])
    ),
  ADD COLUMN "effective_start_date" date,
  ADD COLUMN "effective_end_date" date,
  ADD CONSTRAINT "patient_programs_effective_dates_check" CHECK (
    "effective_start_date" IS NULL
    OR "effective_end_date" IS NULL
    OR "effective_start_date" <= "effective_end_date"
  );

-- Remove deprecated exercise assignments — they do not carry over
DELETE FROM "public"."patient_programs" pp
  USING "public"."exercises" e
  WHERE pp.exercise_id = e.id
    AND e.lifecycle_status = 'deprecated';

-- Backfill: archived exercises → inactive
UPDATE "public"."patient_programs" pp
  SET "assignment_status" = 'inactive'
  FROM "public"."exercises" e
  WHERE pp.exercise_id = e.id
    AND e.lifecycle_status = 'archived';

-- Backfill: on_hold exercises → on_hold
UPDATE "public"."patient_programs" pp
  SET "assignment_status" = 'on_hold'
  FROM "public"."exercises" e
  WHERE pp.exercise_id = e.id
    AND e.lifecycle_status = 'on_hold';

-- Backfill: as_needed exercises → as_needed
UPDATE "public"."patient_programs" pp
  SET "assignment_status" = 'as_needed'
  FROM "public"."exercises" e
  WHERE pp.exercise_id = e.id
    AND e.lifecycle_status = 'as_needed';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_patient_programs_patient_status"
  ON "public"."patient_programs"("patient_id", "assignment_status")
  WHERE "assignment_status" != 'inactive';

CREATE INDEX IF NOT EXISTS "idx_patient_programs_effective_dates"
  ON "public"."patient_programs"("patient_id", "effective_start_date", "effective_end_date")
  WHERE "assignment_status" IN ('active', 'as_needed', 'on_hold');
