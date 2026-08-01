export const SLASH_SEPARATOR = '/';
export const PERCENT_SUFFIX = '%';
export const CORRECT_LABEL = 'Correct';
export const INCORRECT_LABEL = 'Incorrect';
export const AVG_CONFIDENCE_LABEL = 'Avg confidence';
export const NOT_AVAILABLE = '—';
export const ACCURACY_SEPARATOR = ' · ';
export const ACCURACY_SUFFIX = ' accuracy';
export const ADAPTIVE_UNLOCKED_TITLE = 'Adaptive Practice Unlocked! 🎉';
export const ADAPTIVE_PROGRESS_TITLE = 'Adaptive Mode Progress';
export const SESSIONS_PROGRESS_SUFFIX = ' sessions completed';
export const UNLOCKED_BADGE_TEXT = 'Unlocked';

interface EncouragementTier {
  minPercentage: number;
  text: string;
}

const ENCOURAGEMENT_TIERS: EncouragementTier[] = [
  { minPercentage: 80, text: 'Excellent work! 🎉' },
  { minPercentage: 50, text: 'Good progress! 📈' },
  { minPercentage: 0, text: 'Keep practicing! 💪' },
];

export function getEncouragement(percentage: number): string {
  const tier = ENCOURAGEMENT_TIERS.find((candidate) => percentage >= candidate.minPercentage);
  return tier?.text ?? ENCOURAGEMENT_TIERS[ENCOURAGEMENT_TIERS.length - 1].text;
}
