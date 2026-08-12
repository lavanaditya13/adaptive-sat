export const TITLE = 'General Practice';
export const START_LABEL = 'Start Practice';
export const NOT_STARTED_LABEL = 'Not started yet';

export function buildDescription(domainsCount: number): string {
  return `Mixed questions from all ${domainsCount} domain${domainsCount === 1 ? '' : 's'}. Great for a full review.`;
}

/* SVG donut geometry, matches the approved mockup's ring (r=15.9, viewBox 36x36). */
export const RING_RADIUS = 15.9;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
