// components/ProgramPatientSelector.js — stateless patient selector for program page
import NativeSelect from './NativeSelect';

/**
 * Stateless patient selector dropdown.
 * Options are expected as { id, name, patient } objects.
 * @param {{ patientOptions: array, selectedPatientId: string|null, onChange: function }} params
 */
export default function ProgramPatientSelector({
  patientOptions = [],
  selectedPatientId = null,
  onChange,
}) {
  if (!patientOptions.length) return null;

  const normalizedOptions = patientOptions.map(({ id, name }) => ({
    value: id,
    label: name,
  }));

  return (
    <NativeSelect
      value={selectedPatientId || ''}
      onChange={onChange}
      options={normalizedOptions}
      placeholder="Select patient"
    />
  );
}
