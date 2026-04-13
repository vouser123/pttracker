// components/ExercisePicker.js — exercise picker UI for tracker search, sort, selection, and drag feedback
import { memo } from 'react';
import styles from './ExercisePicker.module.css';
import NativeSelect from './NativeSelect';

const LIFECYCLE_OPTIONS = [
  { value: 'routine', label: 'Routine only' },
  { value: 'prn', label: 'PRN only' },
  { value: 'all', label: 'Show all' },
];

const SORT_OPTIONS = [
  { value: 'pt_order', label: 'PT order' },
  { value: 'manual', label: 'Manual' },
  { value: 'body_area', label: 'Body area' },
  { value: 'recent', label: 'Recent activity' },
  { value: 'alpha', label: 'A to Z' },
];

const ExercisePickerCard = memo(function ExercisePickerCard({
  exercise,
  isSelected,
  isDragging,
  isPendingDrag,
  isManualMode,
  canEditDosage,
  onSelect,
  onEditDosage,
  onDragStart,
  setCardRef,
}) {
  const cardClassName = [
    styles.card,
    isSelected ? styles.selected : '',
    isDragging || isPendingDrag ? styles.dragPlaceholder : '',
    canEditDosage && isManualMode ? styles.cardWithTwoActions : '',
    canEditDosage && !isManualMode ? styles.cardWithEditAction : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={(node) => setCardRef(exercise.id, node)} className={cardClassName}>
      <button
        className={styles.cardButton}
        onPointerUp={() => {
          if (isDragging) return;
          onSelect?.(exercise.id);
        }}
        aria-pressed={isSelected}
        type="button"
      >
        <span className={styles.name}>{exercise.canonical_name}</span>
        {exercise.isPrn && <span className={styles.prnBadge}>PRN</span>}
        <span className={styles.dosage}>{exercise.dosageText}</span>
        {exercise.adherenceLabel && (
          <span className={`${styles.adherence} ${styles[exercise.adherenceTone]}`}>
            {exercise.adherenceLabel}
          </span>
        )}
        {exercise.pt_category && <span className={styles.tag}>{exercise.pt_category}</span>}
      </button>
      {canEditDosage && (
        <button
          type="button"
          className={styles.editAction}
          aria-label={`${exercise.dosageActionLabel} for ${exercise.canonical_name}`}
          onPointerUp={(event) => {
            event.stopPropagation();
            onEditDosage?.(exercise.id);
          }}
        >
          Dosage
        </button>
      )}
      {isManualMode && (
        <button
          type="button"
          className={styles.dragHandle}
          aria-label={`Reorder ${exercise.canonical_name}`}
          onPointerDown={(event) => onDragStart(event, exercise)}
        >
          <span className={styles.dragGrip} aria-hidden="true">
            <span className={styles.dragDot} />
            <span className={styles.dragDot} />
            <span className={styles.dragDot} />
            <span className={styles.dragDot} />
            <span className={styles.dragDot} />
            <span className={styles.dragDot} />
          </span>
        </button>
      )}
    </div>
  );
});

export default function ExercisePicker({
  pickerModel,
  selectedId = null,
  onSelect,
  onEditDosage,
  canEditDosage = false,
  sortMode = 'pt_order',
  onSortChange,
  lifecycleFilter = 'routine',
  onLifecycleFilterChange,
}) {
  const {
    query,
    setQuery,
    isManualMode,
    visibleExercises,
    pendingDrag,
    dragState,
    dragOverlayRef,
    listRef,
    setCardRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = pickerModel;

  return (
    <section className={styles.panel} aria-label="Exercise picker">
      <div className={styles.controls}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={styles.search}
          placeholder="Search exercises"
          aria-label="Search exercises"
        />
        <NativeSelect
          value={lifecycleFilter}
          onChange={(value) => onLifecycleFilterChange?.(value)}
          options={LIFECYCLE_OPTIONS}
          className={styles.sortSelect}
        />
        <NativeSelect
          value={sortMode}
          onChange={(value) => onSortChange?.(value)}
          options={SORT_OPTIONS}
          className={styles.sortSelect}
        />
      </div>

      {visibleExercises.length === 0 && <div className={styles.empty}>No exercises found.</div>}

      <div ref={listRef} className={styles.list}>
        {visibleExercises.map((exercise) => (
          <ExercisePickerCard
            key={exercise.id}
            exercise={exercise}
            isSelected={exercise.id === selectedId}
            isDragging={Boolean(dragState?.dragging && dragState.exerciseId === exercise.id)}
            isPendingDrag={pendingDrag?.exerciseId === exercise.id}
            isManualMode={isManualMode}
            canEditDosage={canEditDosage}
            onSelect={onSelect}
            onEditDosage={onEditDosage}
            onDragStart={handleDragStart}
            setCardRef={setCardRef}
          />
        ))}
      </div>

      {dragState?.dragging && (
        <>
          <div
            ref={dragOverlayRef}
            className={styles.dragOverlay}
            aria-hidden="true"
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          />
          <div
            className={styles.dragGhost}
            style={{
              left: `${dragState.x - dragState.offsetX}px`,
              top: `${dragState.y - dragState.offsetY}px`,
              width: dragState.width ? `${dragState.width}px` : undefined,
            }}
            aria-hidden="true"
          >
            <span className={styles.name}>{dragState.exerciseName}</span>
            <span className={styles.dosage}>{dragState.dosageText}</span>
          </div>
        </>
      )}
    </section>
  );
}
