export const CORRECT_LABEL = 'Correct';
export const INCORRECT_LABEL = 'Incorrect';
export const CORRECT_ANSWER_LABEL = 'Correct answer';
export const EXPLANATION_TITLE = 'Explanation';

/** Post-answer feedback. Only rendered when the caller has it — the session
 *  endpoints withhold the correct answer until the session is completed. */
export interface QuestionFeedback {
  correctAnswer: string;
  explanation: string | null;
}
