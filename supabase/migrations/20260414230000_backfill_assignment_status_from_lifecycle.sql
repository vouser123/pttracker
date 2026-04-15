-- Corrective backfill: set assignment_status from exercises.lifecycle_status
--
-- The initial migration defaulted all rows to 'active'. This migration applies
-- the correct mapping:
--   active     → active (already correct, no update needed)
--   on_hold    → on_hold
--   as_needed  → as_needed
--   archived   → inactive
--   deprecated → deleted (should not exist as patient assignments)

-- Remove any deprecated exercise assignments
DELETE FROM "public"."patient_programs" pp
  USING "public"."exercises" e
  WHERE pp.exercise_id = e.id
    AND e.lifecycle_status = 'deprecated';

-- archived exercises → inactive
UPDATE "public"."patient_programs" pp
  SET "assignment_status" = 'inactive'
  FROM "public"."exercises" e
  WHERE pp.exercise_id = e.id
    AND e.lifecycle_status = 'archived';

-- on_hold exercises → on_hold
UPDATE "public"."patient_programs" pp
  SET "assignment_status" = 'on_hold'
  FROM "public"."exercises" e
  WHERE pp.exercise_id = e.id
    AND e.lifecycle_status = 'on_hold';

-- as_needed exercises → as_needed
UPDATE "public"."patient_programs" pp
  SET "assignment_status" = 'as_needed'
  FROM "public"."exercises" e
  WHERE pp.exercise_id = e.id
    AND e.lifecycle_status = 'as_needed';
