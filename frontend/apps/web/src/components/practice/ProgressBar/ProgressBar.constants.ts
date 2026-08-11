export const PROGRESS_LABEL = 'Session progress';

/** Per-question progress state, mirroring `segmentsVM` in the design source. */
export type SegmentState = 'answered' | 'skipped' | 'upcoming';
