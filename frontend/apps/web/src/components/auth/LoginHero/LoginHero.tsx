import { Target } from 'lucide-react';
import {
  LOGO_TEXT,
  DEFAULT_HEADLINE_LEAD,
  DEFAULT_HEADLINE_HIGHLIGHT,
  DEFAULT_SUBCOPY,
  STAT_IMPROVE_VALUE,
  STAT_IMPROVE_LABEL,
  STAT_POINTS_VALUE,
  STAT_POINTS_LABEL,
} from './LoginHero.constants';
import {
  PANEL_STYLES,
  GLOW_STYLES,
  LOGO_ROW_STYLES,
  LOGO_MARK_STYLES,
  LOGO_TEXT_STYLES,
  HEADLINE_BLOCK_STYLES,
  HEADLINE_STYLES,
  HEADLINE_HIGHLIGHT_STYLES,
  SUBCOPY_STYLES,
  STATS_ROW_STYLES,
  STAT_VALUE_STYLES,
  STAT_LABEL_STYLES,
} from './LoginHero.styles';

interface LoginHeroProps {
  headlineLead?: string;
  headlineHighlight?: string;
  subcopy?: string;
}

export function LoginHero({
  headlineLead = DEFAULT_HEADLINE_LEAD,
  headlineHighlight = DEFAULT_HEADLINE_HIGHLIGHT,
  subcopy = DEFAULT_SUBCOPY,
}: LoginHeroProps) {
  return (
    <div className={PANEL_STYLES}>
      <div className={GLOW_STYLES} />

      <div className={LOGO_ROW_STYLES}>
        <span className={LOGO_MARK_STYLES}>
          <Target className="size-5" />
        </span>
        <span className={LOGO_TEXT_STYLES}>{LOGO_TEXT}</span>
      </div>

      <div className={HEADLINE_BLOCK_STYLES}>
        <h1 className={HEADLINE_STYLES}>
          {headlineLead} <span className={HEADLINE_HIGHLIGHT_STYLES}>{headlineHighlight}</span>
        </h1>
        <p className={SUBCOPY_STYLES}>{subcopy}</p>
      </div>

      <div className={STATS_ROW_STYLES}>
        <div>
          <p className={STAT_VALUE_STYLES}>{STAT_IMPROVE_VALUE}</p>
          <p className={STAT_LABEL_STYLES}>{STAT_IMPROVE_LABEL}</p>
        </div>
        <div>
          <p className={STAT_VALUE_STYLES}>{STAT_POINTS_VALUE}</p>
          <p className={STAT_LABEL_STYLES}>{STAT_POINTS_LABEL}</p>
        </div>
      </div>
    </div>
  );
}
