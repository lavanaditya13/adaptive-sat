export const GREETING_MORNING = 'Good morning';
export const GREETING_AFTERNOON = 'Good afternoon';
export const GREETING_EVENING = 'Good evening';
export const GREETING_PREFIX = 'Hey, ';
export const GREETING_SUFFIX = ' 👋';

export const SECTIONS_TITLE = 'Practice Sections';
export const SECTIONS_EMPTY_MESSAGE =
  'Practice sections will appear here once the question bank is loaded.';

export const QUESTIONS_CORRECT_LABEL = 'Questions Correct';
export const QUESTIONS_CORRECT_CAPTION_PREFIX = 'of ';
export const QUESTIONS_CORRECT_CAPTION_SUFFIX = ' attempted';
export const TESTS_TAKEN_LABEL = 'Tests Taken';
export const TESTS_TAKEN_CAPTION_PREFIX = 'avg ';
export const TESTS_TAKEN_CAPTION_SUFFIX = ' min each';
export const ACCURACY_LABEL = 'Accuracy Rate';
export const ACCURACY_CAPTION_SUFFIX = '% this week';
export const ACCURACY_CAPTION_NO_TREND = 'across all sessions';
export const DAY_STREAK_LABEL = 'Day Streak';
export const DAY_STREAK_CAPTION = 'Keep it going!';
export const DAY_STREAK_CAPTION_EMPTY = 'Practice today to start one';
export const PERCENT_SUFFIX = '%';

export const NO_ATTEMPTS_TITLE = 'No practice data yet';
export const NO_ATTEMPTS_MESSAGE =
  'Finish your first practice session and your estimated SAT score will show up here.';

export const ERROR_RETRY_LABEL = 'Try again';

const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 18;

/** Time-of-day eyebrow above the greeting. */
export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < MORNING_END_HOUR) {
    return GREETING_MORNING;
  }

  if (hour < AFTERNOON_END_HOUR) {
    return GREETING_AFTERNOON;
  }

  return GREETING_EVENING;
}
