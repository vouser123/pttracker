-- Migration 017: Create form_parameter_metadata table
-- Stores display metadata per form parameter name: optional suffix for text params,
-- optional unit_options list for numeric params. Replaces hardcoded parameterOptions()
-- in the session logger and enables contextual labels in history display.

CREATE TABLE form_parameter_metadata (
  parameter_name TEXT PRIMARY KEY,
  display_suffix TEXT,
  unit_options TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE form_parameter_metadata IS 'Display metadata per form parameter name. display_suffix appended after text values (e.g. band → heavy band). unit_options drives numeric input + unit picker in the session logger.';
COMMENT ON COLUMN form_parameter_metadata.display_suffix IS 'Appended after the parameter value in display (e.g. "band" → "heavy band"). NULL for numeric parameters.';
COMMENT ON COLUMN form_parameter_metadata.unit_options IS 'Ordered list of unit choices for numeric parameters (e.g. {ft,in,cm,deg}). NULL for text parameters.';

-- Seed known numeric parameters (replaces hardcoded parameterOptions() logic)
INSERT INTO form_parameter_metadata (parameter_name, unit_options) VALUES
  ('weight',   ARRAY['lb', 'kg']),
  ('distance', ARRAY['ft', 'in', 'cm', 'deg']);

-- RLS: all authenticated users can read; therapist/admin can write
ALTER TABLE form_parameter_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY form_parameter_metadata_select
  ON form_parameter_metadata FOR SELECT TO authenticated USING (true);

CREATE POLICY form_parameter_metadata_modify
  ON form_parameter_metadata FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role IN ('therapist', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role IN ('therapist', 'admin')
    )
  );
