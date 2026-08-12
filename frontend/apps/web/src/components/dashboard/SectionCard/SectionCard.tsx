import { ChevronRight } from 'lucide-react';
import type { DashboardResponse } from '@/types/api';
import {
  ACCURACY_LABEL,
  DOMAINS_LABEL,
  PERCENT_SUFFIX,
  QUESTIONS_LABEL,
  SECTION_DESCRIPTIONS,
  getAccuracyToneStyles,
  getSectionAccent,
} from './SectionCard.constants';
import {
  CARD_STYLES,
  CHEVRON_STYLES,
  CHEVRON_TILE_STYLES,
  DESCRIPTION_STYLES,
  HEADER_ROW_STYLES,
  ICON_STYLES,
  ICON_TILE_STYLES,
  STAT_DIVIDER_STYLES,
  STAT_LABEL_STYLES,
  STAT_VALUE_STYLES,
  STATS_ROW_STYLES,
  TITLE_STYLES,
} from './SectionCard.styles';

type DashboardSection = DashboardResponse['sections'][number];

interface SectionCardProps {
  section: DashboardSection;
  onSelect: (section: DashboardSection) => void;
}

/** Practice-section entry point: opens the subject screen of the practice flow. */
export function SectionCard({ section, onSelect }: SectionCardProps) {
  const accent = getSectionAccent(section.name);
  const Icon = accent.icon;

  return (
    <button type="button" className={CARD_STYLES} onClick={() => onSelect(section)}>
      <div className={HEADER_ROW_STYLES}>
        <span className={`${ICON_TILE_STYLES} ${accent.tile}`} aria-hidden="true">
          <Icon className={ICON_STYLES} strokeWidth={2} />
        </span>
        <span className={CHEVRON_TILE_STYLES} aria-hidden="true">
          <ChevronRight className={CHEVRON_STYLES} />
        </span>
      </div>

      <h3 className={TITLE_STYLES}>{section.display_name}</h3>
      <p className={DESCRIPTION_STYLES}>
        {SECTION_DESCRIPTIONS[section.name] ?? section.display_name}
      </p>

      <div className={STATS_ROW_STYLES}>
        <div>
          <p className={STAT_LABEL_STYLES}>{ACCURACY_LABEL}</p>
          <p
            className={`${STAT_VALUE_STYLES} ${getAccuracyToneStyles(section.accuracy_percentage)}`}
          >
            {section.accuracy_percentage}
            {PERCENT_SUFFIX}
          </p>
        </div>
        <div className={STAT_DIVIDER_STYLES} />
        <div>
          <p className={STAT_LABEL_STYLES}>{QUESTIONS_LABEL}</p>
          <p className={STAT_VALUE_STYLES}>{section.questions_completed}</p>
        </div>
        <div className={STAT_DIVIDER_STYLES} />
        <div>
          <p className={STAT_LABEL_STYLES}>{DOMAINS_LABEL}</p>
          <p className={STAT_VALUE_STYLES}>{section.topics_count}</p>
        </div>
      </div>
    </button>
  );
}
