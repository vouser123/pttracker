DO $$
DECLARE
    lifecycle_constraint_name text;
BEGIN
    SELECT con.conname
    INTO lifecycle_constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'exercises'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%lifecycle_status%';

    IF lifecycle_constraint_name IS NOT NULL THEN
        EXECUTE format(
            'ALTER TABLE public.exercises DROP CONSTRAINT %I',
            lifecycle_constraint_name
        );
    END IF;
END $$;

ALTER TABLE public.exercises
    ADD CONSTRAINT exercises_lifecycle_status_check
    CHECK (lifecycle_status IN ('active', 'as_needed', 'archived', 'deprecated'));
