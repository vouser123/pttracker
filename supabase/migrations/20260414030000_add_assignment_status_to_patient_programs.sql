-- Add patient-scoped assignment status and effective dates to patient_programs
--
-- This migration adds:
-- 1. assignment_status: patient-scoped program status (active/inactive/on_hold/as_needed)
-- 2. effective_start_date: when the assignment became active (nullable)
-- 3. effective_end_date: when the assignment stops (nullable)
-- 4. check constraint: effective_start_date <= effective_end_date
--
-- Backfill logic:
-- - Default: assignment_status = 'active'
-- - If archived_at IS NOT NULL: assignment_status = 'inactive' (patient-specific stop)
-- - Soft-deleted rows (archived_at IS NOT NULL) left with default dates
-- - Global exercise lifecycle_status is NOT considered in backfill (hard floor applies at read time)
--
-- Going forward:
-- - Global exercises.archived/deprecated status is independent of patient assignment_status
-- - Patient-scoped inactive is distinct from library-scoped archived/deprecated
-- - reads use resolveEffectiveStatus hard-floor pattern to combine both layers

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

-- Backfill: archived rows become inactive
UPDATE "public"."patient_programs"
  SET "assignment_status" = 'inactive'
  WHERE "archived_at" IS NOT NULL;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_patient_programs_patient_status"
  ON "public"."patient_programs"("patient_id", "assignment_status")
  WHERE "assignment_status" != 'inactive';

CREATE INDEX IF NOT EXISTS "idx_patient_programs_effective_dates"
  ON "public"."patient_programs"("patient_id", "effective_start_date", "effective_end_date")
  WHERE "assignment_status" IN ('active', 'as_needed', 'on_hold');
