import { ChevronRight } from 'lucide-react';
import type { PracticeAccent } from '@/constants/practice-visuals';
import {
  ACCURACY_LABEL,
  DOMAINS_LABEL,
  NOT_STARTED_LABEL,
  QUESTIONS_DONE_LABEL,
} from './SubjectCard.constants';
import {
  CARD_STYLES,
  CHEVRON_TILE_STYLES,
  DESCRIPTION_STYLES,
  ICON_TILE_STYLES,
  STAT_DIVIDER_STYLES,
  STAT_LABEL_STYLES,
  STAT_VALUE_STYLES,
  STATS_ROW_STYLES,
  TITLE_STYLES,
  TOP_ROW_STYLES,
} from './SubjectCard.styles';

interface SubjectCardProps {
  label: string;
  description: string;
  accent: PracticeAccent;
  accuracy: number;
  questionsDone: number;
  domainsCount: number;
  isLoading?: boolean;
  onClick: () => void;
}

export function SubjectCard({
  label,
  description,
  accent,
  accuracy,
  questionsDone,
  domainsCount,
  isLoading = false,
  onClick,
}: SubjectCardProps) {
  const Icon = accent.Icon;

  return (
    <button type="button" className={CARD_STYLES} onClick={onClick} disabled={isLoading}>
      <div className={TOP_ROW_STYLES}>
        <div className={`${ICON_TILE_STYLES} ${accent.tint}`}>
          <Icon className={`size-5 ${accent.text}`} aria-hidden="true" />
        </div>
        <div className={CHEVRON_TILE_STYLES}>
          <ChevronRight className="size-3.5 text-ink-muted" aria-hidden="true" />
        </div>
      </div>

      <h3 className={TITLE_STYLES}>{label}</h3>
      <p className={DESCRIPTION_STYLES}>{description}</p>

      <div className={STATS_ROW_STYLES}>
        <div>
          <p className={STAT_LABEL_STYLES}>{ACCURACY_LABEL}</p>
          <p className={STAT_VALUE_STYLES}>
            {isLoading ? '—' : questionsDone === 0 ? NOT_STARTED_LABEL : `${accuracy}%`}
          </p>
        </div>
        <div className={STAT_DIVIDER_STYLES} />
        <div>
          <p className={STAT_LABEL_STYLES}>{QUESTIONS_DONE_LABEL}</p>
          <p className={STAT_VALUE_STYLES}>{isLoading ? '—' : questionsDone}</p>
        </div>
        <div className={STAT_DIVIDER_STYLES} />
        <div>
          <p className={STAT_LABEL_STYLES}>{DOMAINS_LABEL}</p>
          <p className={STAT_VALUE_STYLES}>{isLoading ? '—' : domainsCount}</p>
        </div>
      </div>
    </button>
  );
}
