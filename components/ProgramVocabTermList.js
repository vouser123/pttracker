// components/ProgramVocabTermList.js — existing-term list for the program vocabulary workspace
import styles from './ExerciseForm.module.css';
import ProgramVocabTermRow from './ProgramVocabTermRow';

export default function ProgramVocabTermList({
  selectedTerms,
  editCode,
  editDefinition,
  archiveReviewCode,
  onEditDefinitionChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onStartArchiveReview,
  onCancelArchiveReview,
  onConfirmArchive,
  saving,
}) {
  if (selectedTerms.length === 0) {
    return <p className={styles.emptyNote}>No active terms in this category yet.</p>;
  }

  return (
    <div className={styles.vocabList}>
      {selectedTerms.map((term) => (
        <ProgramVocabTermRow
          key={term.code}
          term={term}
          isEditing={editCode === term.code}
          isReviewingArchive={archiveReviewCode === term.code}
          editDefinition={editDefinition}
          onEditDefinitionChange={onEditDefinitionChange}
          onStartEdit={() => onStartEdit(term)}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          onStartArchiveReview={() => onStartArchiveReview(term)}
          onCancelArchiveReview={onCancelArchiveReview}
          onConfirmArchive={() => onConfirmArchive(term)}
          saving={saving}
        />
      ))}
    </div>
  );
}
