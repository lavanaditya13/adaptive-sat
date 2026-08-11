import type { LucideIcon } from 'lucide-react';
import type { StatTone } from './StatCard.constants';
import {
  CAPTION_STYLES,
  CARD_STYLES,
  HEADER_ROW_STYLES,
  ICON_STYLES,
  ICON_TILE_STYLES,
  LABEL_STYLES,
  TONE_STYLES,
  VALUE_STYLES,
} from './StatCard.styles';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: StatTone;
  caption?: string;
}

/** Single tinted metric tile in the dashboard stat grid. */
export function StatCard({ label, value, icon: Icon, tone, caption }: StatCardProps) {
  const toneStyles = TONE_STYLES[tone];

  return (
    <div className={`${CARD_STYLES} ${toneStyles.border}`}>
      <div className={HEADER_ROW_STYLES}>
        <p className={LABEL_STYLES}>{label}</p>
        <span className={`${ICON_TILE_STYLES} ${toneStyles.tile}`} aria-hidden="true">
          <Icon className={ICON_STYLES} strokeWidth={2} />
        </span>
      </div>
      <p className={`${VALUE_STYLES} ${toneStyles.value}`}>{value}</p>
      {caption && <p className={CAPTION_STYLES}>{caption}</p>}
    </div>
  );
}
