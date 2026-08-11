import { Skeleton } from '@workspace/ui/components/skeleton';
import { getApiErrorDetail } from '@/utils/api-errors';
import { LOADING_LABEL, RETRY_LABEL, SKELETON_ROW_COUNT } from './DrillDownStatus.constants';
import {
  ERROR_PANEL_STYLES,
  ERROR_TEXT_STYLES,
  LIST_STYLES,
  RETRY_BUTTON_STYLES,
  SKELETON_ROW_STYLES,
} from './DrillDownStatus.styles';

interface DrillDownSkeletonProps {
  rowCount?: number;
}

/** Placeholder rows while the skill tree loads. */
export function DrillDownSkeleton({ rowCount = SKELETON_ROW_COUNT }: DrillDownSkeletonProps) {
  return (
    <div className={LIST_STYLES} aria-busy="true" aria-label={LOADING_LABEL}>
      {Array.from({ length: rowCount }, (_, index) => (
        <Skeleton key={index} className={SKELETON_ROW_STYLES} />
      ))}
    </div>
  );
}

interface DrillDownErrorProps {
  error: unknown;
  onRetry?: () => void;
}

/** Shared failure state for every drill-down screen. */
export function DrillDownError({ error, onRetry }: DrillDownErrorProps) {
  return (
    <div className={ERROR_PANEL_STYLES} role="alert">
      <p className={ERROR_TEXT_STYLES}>{getApiErrorDetail(error)}</p>
      {onRetry && (
        <button type="button" className={RETRY_BUTTON_STYLES} onClick={onRetry}>
          {RETRY_LABEL}
        </button>
      )}
    </div>
  );
}
