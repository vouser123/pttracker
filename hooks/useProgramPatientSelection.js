// hooks/useProgramPatientSelection.js — patient selection state for program page
import { useCallback, useState } from 'react';
import { formatDisplayName } from '../lib/users';

/**
 * Derives patient options from therapist's patient list and manages selected patient state.
 * @param {{ allUsers: array, authUserId: string }} params
 * @returns {{ patientOptions: array, selectedPatientId: string|null, selectedPatientName: string, setSelectedPatientId: function }}
 */
export function useProgramPatientSelection({ allUsers, authUserId }) {
  const currentUser = (allUsers ?? []).find((user) => user.auth_id === authUserId);

  // For therapist: get list of patients assigned to them
  // For admin/patient: use current user as the patient
  const patientOptions =
    currentUser?.role === 'therapist'
      ? (allUsers ?? [])
          .filter((user) => user.therapist_id === currentUser.id)
          .map((patient) => ({
            id: patient.id,
            name: formatDisplayName(patient),
            patient,
          }))
      : currentUser
        ? [
            {
              id: currentUser.id,
              name: formatDisplayName(currentUser),
              patient: currentUser,
            },
          ]
        : [];

  // Initialize with first patient if available
  const [selectedPatientId, setSelectedPatientId] = useState(patientOptions[0]?.id ?? null);

  const selectedPatientName =
    patientOptions.find((opt) => opt.id === selectedPatientId)?.name ?? '';

  return {
    patientOptions,
    selectedPatientId,
    selectedPatientName,
    setSelectedPatientId: useCallback((id) => setSelectedPatientId(id), []),
  };
}
