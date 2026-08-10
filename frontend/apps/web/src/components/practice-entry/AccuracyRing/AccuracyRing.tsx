import {
  RING_CENTER,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  RING_SIZE_PX,
  RING_STROKE_WIDTH,
  RING_VIEW_BOX,
} from './AccuracyRing.constants';
import {
  SVG_STYLES,
  TRACK_STYLES,
  VALUE_STYLES,
  WRAPPER_STYLES,
} from './AccuracyRing.styles';

interface AccuracyRingProps {
  /** Whole-percent accuracy, 0-100. */
  value: number;
  /** Tailwind `stroke-*` class for the filled arc. */
  strokeClassName: string;
  /** Tailwind `text-*` class for the centred label. */
  labelClassName: string;
  label: string;
}

/** Donut gauge used by the practice-home mode cards. */
export function AccuracyRing({
  value,
  strokeClassName,
  labelClassName,
  label,
}: AccuracyRingProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const filled = (clamped / 100) * RING_CIRCUMFERENCE;

  return (
    <div className={WRAPPER_STYLES}>
      <svg
        width={RING_SIZE_PX}
        height={RING_SIZE_PX}
        viewBox={RING_VIEW_BOX}
        className={SVG_STYLES}
        role="img"
        aria-label={label}
      >
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE_WIDTH}
          className={TRACK_STYLES}
        />
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${filled.toFixed(1)} ${(RING_CIRCUMFERENCE - filled).toFixed(1)}`}
          className={strokeClassName}
        />
      </svg>
      <span className={`${VALUE_STYLES} ${labelClassName}`} aria-hidden="true">
        {clamped}%
      </span>
    </div>
  );
}
