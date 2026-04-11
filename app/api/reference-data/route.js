// app/api/reference-data/route.js — GET distinct equipment, muscles, and form parameter names.

import { getSupabaseWithAuth } from '../../../lib/db.js';
import { authenticateRoute, serverError, unauthorized } from '../../../lib/route-auth.js';

/**
 * GET /api/reference-data
 *
 * Returns distinct values that exist in the database for use in dropdowns.
 * These are not controlled vocabularies but dynamic values based on actual usage.
 */
export async function GET(request) {
  const { accessToken, error } = await authenticateRoute(request);
  if (error) return unauthorized(error);

  const supabase = getSupabaseWithAuth(accessToken);

  try {
    const [
      { data: equipmentData, error: equipmentError },
      { data: muscleData, error: muscleError },
      { data: formParamData, error: formParamError },
    ] = await Promise.all([
      supabase.from('exercise_equipment').select('equipment_name').order('equipment_name'),
      supabase.from('exercise_muscles').select('muscle_name').order('muscle_name'),
      supabase.from('exercise_form_parameters').select('parameter_name').order('parameter_name'),
    ]);

    if (equipmentError) throw equipmentError;
    if (muscleError) throw muscleError;
    if (formParamError) throw formParamError;

    const equipment = [...new Set(equipmentData.map((e) => e.equipment_name))].sort();
    const muscles = [...new Set(muscleData.map((m) => m.muscle_name))].sort();
    const formParameters = [...new Set(formParamData.map((fp) => fp.parameter_name))].sort();

    return Response.json({ equipment, muscles, formParameters });
  } catch (err) {
    console.error('Error fetching reference data:', err);
    return serverError('Failed to fetch reference data', err);
  }
}
