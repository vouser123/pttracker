DO $$
DECLARE
  existing_constraint text;
BEGIN
  SELECT con.conname
    INTO existing_constraint
  FROM pg_constraint con
  JOIN pg_class rel
    ON rel.oid = con.conrelid
  JOIN pg_namespace nsp
    ON nsp.oid = con.connamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'exercises'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%lifecycle_status%';

  IF existing_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.exercises DROP CONSTRAINT %I', existing_constraint);
  END IF;

  ALTER TABLE public.exercises
    ADD CONSTRAINT exercises_lifecycle_status_check
    CHECK (lifecycle_status IN ('active', 'on_hold', 'as_needed', 'archived', 'deprecated'));
END $$;
