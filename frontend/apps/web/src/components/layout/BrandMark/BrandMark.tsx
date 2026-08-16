import { BRAND_ROW_STYLES, LOGO_STYLES, WORDMARK_STYLES } from './BrandMark.styles';
import { LOGO_TITLE, WORDMARK } from './BrandMark.constants';

interface BrandMarkProps {
  /** Hide the wordmark when the sidebar rail is collapsed. */
  showWordmark?: boolean;
}

export function BrandMark({ showWordmark = true }: BrandMarkProps) {
  return (
    <div className={BRAND_ROW_STYLES}>
      <span className={LOGO_STYLES}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-label={LOGO_TITLE}
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {showWordmark && <span className={WORDMARK_STYLES}>{WORDMARK}</span>}
    </div>
  );
}
