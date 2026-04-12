// components/ProgramVocabEditor.js — controlled-vocabulary editor for the program workspace
import { useEffect, useMemo, useState } from 'react';
import styles from './ExerciseForm.module.css';
import NativeSelect from './NativeSelect';
import ProgramVocabAddTermForm from './ProgramVocabAddTermForm';
import ProgramVocabTermList from './ProgramVocabTermList';

const CATEGORY_METADATA = [
  { key: 'region', label: 'Regions' },
  { key: 'capacity', label: 'Capacities' },
  { key: 'focus', label: 'Focus Areas' },
  { key: 'contribution', label: 'Contributions' },
  { key: 'pt_category', label: 'PT Categories' },
  { key: 'pattern', label: 'Patterns' },
];

function formatCodeInput(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export default function ProgramVocabEditor({
  vocabularies,
  onAddTerm,
  onUpdateTerm,
  onDeleteTerm,
  saving = false,
}) {
  const fieldIds = {
    category: 'program-vocab-category',
    code: 'program-vocab-code',
    definition: 'program-vocab-definition',
  };
  const categoryOptions = useMemo(
    () =>
      CATEGORY_METADATA.filter(({ key }) => Array.isArray(vocabularies?.[key])).map(
        ({ key, label }) => ({ value: key, label }),
      ),
    [vocabularies],
  );
  const [selectedCategory, setSelectedCategory] = useState(categoryOptions[0]?.value ?? 'region');
  const [newCode, setNewCode] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [editCode, setEditCode] = useState(null);
  const [editDefinition, setEditDefinition] = useState('');
  const [archiveReviewCode, setArchiveReviewCode] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!categoryOptions.some((option) => option.value === selectedCategory)) {
      setSelectedCategory(categoryOptions[0]?.value ?? 'region');
    }
  }, [categoryOptions, selectedCategory]);

  const selectedTerms = vocabularies?.[selectedCategory] ?? [];

  useEffect(() => {
    if (!selectedTerms.some((term) => term.code === archiveReviewCode)) {
      setArchiveReviewCode(null);
    }
  }, [archiveReviewCode, selectedTerms]);

  async function handleAddTerm() {
    setError(null);
    const code = formatCodeInput(newCode);
    const definition = newDefinition.trim();

    if (!selectedCategory || !code || !definition) {
      setError('Category, code, and definition are required.');
      return;
    }

    try {
      await onAddTerm({
        table: selectedCategory,
        code,
        definition,
      });
      setNewCode('');
      setNewDefinition('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveEdit() {
    setError(null);
    const definition = editDefinition.trim();
    if (!selectedCategory || !editCode || !definition) {
      setError('Definition is required.');
      return;
    }

    try {
      await onUpdateTerm({
        table: selectedCategory,
        code: editCode,
        definition,
      });
      setEditCode(null);
      setEditDefinition('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTerm(code) {
    setError(null);
    try {
      await onDeleteTerm({
        table: selectedCategory,
        code,
      });
      setArchiveReviewCode(null);
      if (editCode === code) {
        setEditCode(null);
        setEditDefinition('');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConfirmArchive(term) {
    const confirmed = window.confirm(
      `Archive "${term.code}" from active ${selectedCategory.replace(/_/g, ' ')} vocabulary? This is a soft delete only and can be restored later if needed.`,
    );
    if (!confirmed) return;
    await handleDeleteTerm(term.code);
  }

  function handleStartEdit(term) {
    setEditCode(term.code);
    setEditDefinition(term.definition || '');
  }

  function handleCancelEdit() {
    setEditCode(null);
    setEditDefinition('');
  }

  function handleStartArchiveReview(term) {
    setArchiveReviewCode(term.code);
    if (editCode === term.code) {
      setEditCode(null);
      setEditDefinition('');
    }
  }

  return (
    <div className={styles.sectionContent}>
      <div className={styles.formGroup}>
        <label className={styles.fieldLabel} htmlFor={fieldIds.category}>
          Vocabulary Category
        </label>
        <NativeSelect
          id={fieldIds.category}
          className={styles.select}
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={categoryOptions}
        />
      </div>

      {error && <p className={styles.roleError}>{error}</p>}

      <ProgramVocabAddTermForm
        fieldIds={fieldIds}
        newCode={newCode}
        newDefinition={newDefinition}
        onCodeChange={setNewCode}
        onCodeBlur={(value) => setNewCode(formatCodeInput(value))}
        onDefinitionChange={setNewDefinition}
        onAddTerm={handleAddTerm}
        saving={saving}
      />

      <ProgramVocabTermList
        selectedTerms={selectedTerms}
        editCode={editCode}
        editDefinition={editDefinition}
        archiveReviewCode={archiveReviewCode}
        onEditDefinitionChange={setEditDefinition}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onStartArchiveReview={handleStartArchiveReview}
        onCancelArchiveReview={() => setArchiveReviewCode(null)}
        onConfirmArchive={handleConfirmArchive}
        saving={saving}
      />
    </div>
  );
}
