export const TITLE = 'Confidence Level';
export const NOT_SURE_CAPTION = 'Not sure';
export const VERY_CONFIDENT_CAPTION = 'Very confident';
export const LEVEL_LABEL_PREFIX = 'Confidence';

/** 1–5, matching the backend's CHECK constraint on `attempts.confidence_level`. */
export const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_CONFIDENCE = 3;
