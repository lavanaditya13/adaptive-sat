import { ChevronRight } from 'lucide-react';
import { Card } from '@workspace/ui/components/card';
import { getSectionTheme } from '@/constants/section-theme';
import {
  CARD_STYLES,
  HEADER_ROW_STYLES,
  ICON_BADGE_STYLES,
  TITLE_STYLES,
  DESCRIPTION_STYLES,
  STATS_ROW_STYLES,
  STAT_LABEL_STYLES,
  STAT_VALUE_STYLES,
} from './SectionCard.styles';
import { ACCURACY_LABEL, QUESTIONS_LABEL, TOPICS_LABEL, PERCENT_SUFFIX } from './SectionCard.constants';

interface Section {
  section_id: number;
  name: string;
  display_name: string;
  accuracy_percentage: number;
  questions_completed: number;
  topics_count: number;
}

interface SectionCardProps {
  section: Section;
  onOpen: (section: Section) => void;
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  math: 'Algebra, advanced math, geometry, statistics, and data analysis.',
  reading_writing: 'Information and ideas, craft, expression, grammar, and cross-text analysis.',
};

export function SectionCard({ section, onOpen }: SectionCardProps) {
  const theme = getSectionTheme(section.name);
  const Icon = theme.icon;

  return (
    <Card className={CARD_STYLES} onClick={() => onOpen(section)}>
      <div className={HEADER_ROW_STYLES}>
        <span className={`${ICON_BADGE_STYLES} ${theme.bgSoft} ${theme.text}`}>
          <Icon className="size-5" />
        </span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </div>

      <h3 className={TITLE_STYLES}>{section.display_name}</h3>
      <p className={DESCRIPTION_STYLES}>
        {SECTION_DESCRIPTIONS[section.name] ?? section.display_name}
      </p>

      <div className={STATS_ROW_STYLES}>
        <div>
          <p className={STAT_LABEL_STYLES}>{ACCURACY_LABEL}</p>
          <p className={`${STAT_VALUE_STYLES} ${theme.text}`}>
            {section.accuracy_percentage}
            {PERCENT_SUFFIX}
          </p>
        </div>
        <div>
          <p className={STAT_LABEL_STYLES}>{QUESTIONS_LABEL}</p>
          <p className={STAT_VALUE_STYLES}>{section.questions_completed}</p>
        </div>
        <div>
          <p className={STAT_LABEL_STYLES}>{TOPICS_LABEL}</p>
          <p className={STAT_VALUE_STYLES}>{section.topics_count}</p>
        </div>
      </div>
    </Card>
  );
}
