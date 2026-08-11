export const MASTERED_LABEL = 'Mastered';
export const IN_PROGRESS_LABEL = 'In progress';
export const NOT_STARTED_LABEL = 'Not started';

export type MasteryState = 'mastered' | 'in-progress' | 'not-started';

export function getMasteryState(mastered: boolean, questionsAttempted: number): MasteryState {
  if (mastered) {
    return 'mastered';
  }

  return questionsAttempted > 0 ? 'in-progress' : 'not-started';
}

export const MASTERY_LABELS: Record<MasteryState, string> = {
  mastered: MASTERED_LABEL,
  'in-progress': IN_PROGRESS_LABEL,
  'not-started': NOT_STARTED_LABEL,
};
