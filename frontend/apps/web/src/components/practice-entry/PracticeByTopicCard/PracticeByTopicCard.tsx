import { ChevronRight, Layers } from 'lucide-react';
import { buildBrowseLabel, buildDomainChips, DESCRIPTION, TITLE } from './PracticeByTopicCard.constants';
import {
  BOTTOM_SECTION_STYLES,
  BROWSE_ROW_STYLES,
  CARD_STYLES,
  CHIP_STYLES,
  CHIPS_ROW_STYLES,
  DESCRIPTION_STYLES,
  ICON_TILE_STYLES,
  TITLE_STYLES,
  TOP_ROW_STYLES,
  TOP_SECTION_STYLES,
} from './PracticeByTopicCard.styles';

interface PracticeByTopicCardProps {
  domainNames: string[];
  onClick: () => void;
}

export function PracticeByTopicCard({ domainNames, onClick }: PracticeByTopicCardProps) {
  const chips = buildDomainChips(domainNames);

  return (
    <button type="button" className={CARD_STYLES} onClick={onClick}>
      <div className={TOP_SECTION_STYLES}>
        <div className={TOP_ROW_STYLES}>
          <div className={ICON_TILE_STYLES}>
            <Layers className="size-[18px] text-ink-secondary" aria-hidden="true" />
          </div>
          <ChevronRight className="size-[18px] text-ink-muted" aria-hidden="true" />
        </div>
        <h3 className={TITLE_STYLES}>{TITLE}</h3>
        <p className={DESCRIPTION_STYLES}>{DESCRIPTION}</p>
      </div>

      <div className={BOTTOM_SECTION_STYLES}>
        <div className={CHIPS_ROW_STYLES}>
          {chips.map((chip) => (
            <span key={chip} className={CHIP_STYLES}>
              {chip}
            </span>
          ))}
        </div>
        <div className={BROWSE_ROW_STYLES}>
          {buildBrowseLabel(domainNames.length)}
          <ChevronRight className="size-[15px]" aria-hidden="true" />
        </div>
      </div>
    </button>
  );
}
