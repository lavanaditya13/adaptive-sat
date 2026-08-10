import { ChevronRight } from 'lucide-react';
import { getPracticeAccent } from '../practice-accent';
import {
  ACCURACY_TEXT_STYLES,
  formatAccuracy,
  getAccuracyTone,
} from '../practice-entry.utils';
import type { DashboardSection } from '../use-practice-entry';
import {
  ACCURACY_LABEL,
  DOMAINS_LABEL,
  NO_DATA_VALUE,
  QUESTIONS_LABEL,
  getSubjectDescription,
} from './SubjectCard.constants';
import {
  CARD_HEAD_STYLES,
  CARD_STYLES,
  CHEVRON_BOX_STYLES,
  DESCRIPTION_STYLES,
  ICON_TILE_STYLES,
  STATS_ROW_STYLES,
  STAT_DIVIDER_STYLES,
  STAT_LABEL_STYLES,
  STAT_VALUE_STYLES,
  TITLE_STYLES,
} from './SubjectCard.styles';

interface SubjectCardProps {
  section: DashboardSection;
  onSelect: (sectionName: string) => void;
}

interface StatProps {
  label: string;
  value: string | number;
  valueClassName?: string;
}

function Stat({ label, value, valueClassName = 'text-ink' }: StatProps) {
  return (
    <div>
      <p className={STAT_LABEL_STYLES}>{label}</p>
      <p className={`${STAT_VALUE_STYLES} ${valueClassName}`}>{value}</p>
    </div>
  );
}

/** Section chooser tile on `/practice`. */
export function SubjectCard({ section, onSelect }: SubjectCardProps) {
  const accent = getPracticeAccent(section.name);
  const Icon = accent.icon;

  const hasAttempts = section.questions_completed > 0;
  const accuracy = formatAccuracy(section.accuracy_percentage);
  const accuracyTone = getAccuracyTone(accuracy);

  return (
    <button type="button" className={CARD_STYLES} onClick={() => onSelect(section.name)}>
      <div className={CARD_HEAD_STYLES}>
        <div className={`${ICON_TILE_STYLES} ${accent.iconTile}`}>
          <Icon className={`size-5 ${accent.text}`} aria-hidden="true" />
        </div>
        <div className={CHEVRON_BOX_STYLES}>
          <ChevronRight className="size-[15px] text-ink-muted" aria-hidden="true" />
        </div>
      </div>

      <h3 className={TITLE_STYLES}>{section.display_name}</h3>
      <p className={DESCRIPTION_STYLES}>{getSubjectDescription(section.name)}</p>

      <div className={STATS_ROW_STYLES}>
        <Stat
          label={ACCURACY_LABEL}
          value={hasAttempts ? `${accuracy}%` : NO_DATA_VALUE}
          valueClassName={hasAttempts ? ACCURACY_TEXT_STYLES[accuracyTone] : 'text-ink-muted'}
        />
        <div className={STAT_DIVIDER_STYLES} />
        <Stat label={QUESTIONS_LABEL} value={section.questions_completed} />
        <div className={STAT_DIVIDER_STYLES} />
        <Stat label={DOMAINS_LABEL} value={section.topics_count} />
      </div>
    </button>
  );
}
