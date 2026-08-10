import { ChevronRight, Layers } from 'lucide-react';
import type { SkillTreeDomain } from '../practice-entry.types';
import {
  DESCRIPTION,
  EMPTY_CHIP_LABEL,
  MAX_VISIBLE_CHIPS,
  TITLE,
  getBrowseLabel,
  getOverflowChipLabel,
} from './DomainBrowseCard.constants';
import {
  BROWSE_BAR_STYLES,
  CARD_BODY_STYLES,
  CARD_FOOTER_STYLES,
  CARD_HEAD_STYLES,
  CARD_STYLES,
  CHIP_ROW_STYLES,
  CHIP_STYLES,
  DESCRIPTION_STYLES,
  ICON_TILE_STYLES,
  TITLE_STYLES,
} from './DomainBrowseCard.styles';

interface DomainBrowseCardProps {
  /** Real domains from the skill tree — never a hardcoded list. */
  domains: SkillTreeDomain[];
  /** Fallback count while the skill tree is still loading (dashboard `topics_count`). */
  fallbackCount: number;
  onBrowse: () => void;
}

/** Drill-down entry point on the practice home; routes to the domains screen. */
export function DomainBrowseCard({ domains, fallbackCount, onBrowse }: DomainBrowseCardProps) {
  const domainsCount = domains.length > 0 ? domains.length : fallbackCount;
  const visible = domains.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenCount = Math.max(domains.length - visible.length, 0);

  return (
    <button type="button" className={CARD_STYLES} onClick={onBrowse}>
      <div className={CARD_BODY_STYLES}>
        <div className={CARD_HEAD_STYLES}>
          <div className={ICON_TILE_STYLES}>
            <Layers className="size-[18px] text-ink-secondary" aria-hidden="true" />
          </div>
          <ChevronRight className="size-[18px] text-ink-muted" aria-hidden="true" />
        </div>

        <h3 className={TITLE_STYLES}>{TITLE}</h3>
        <p className={DESCRIPTION_STYLES}>{DESCRIPTION}</p>
      </div>

      <div className={CARD_FOOTER_STYLES}>
        <div className={CHIP_ROW_STYLES}>
          {visible.length === 0 ? (
            <span className={CHIP_STYLES}>{EMPTY_CHIP_LABEL}</span>
          ) : (
            <>
              {visible.map((domain) => (
                <span key={domain.topicCode} className={CHIP_STYLES}>
                  {domain.name}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span className={CHIP_STYLES}>{getOverflowChipLabel(hiddenCount)}</span>
              )}
            </>
          )}
        </div>

        <div className={BROWSE_BAR_STYLES}>
          {getBrowseLabel(domainsCount)}
          <ChevronRight className="size-[15px]" aria-hidden="true" />
        </div>
      </div>
    </button>
  );
}
