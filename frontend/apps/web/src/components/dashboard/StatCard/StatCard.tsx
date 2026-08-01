import type { LucideIcon } from 'lucide-react';
import { Card } from '@workspace/ui/components/card';
import {
  CARD_STYLES,
  HEADER_ROW_STYLES,
  LABEL_STYLES,
  ICON_BADGE_STYLES,
  VALUE_STYLES,
  SUBTEXT_STYLES,
} from './StatCard.styles';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  subtext?: string;
}

export function StatCard({ label, value, icon: Icon, subtext }: StatCardProps) {
  return (
    <Card className={CARD_STYLES}>
      <div className={HEADER_ROW_STYLES}>
        <p className={LABEL_STYLES}>{label}</p>
        {Icon && (
          <span className={ICON_BADGE_STYLES}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className={VALUE_STYLES}>{value}</p>
      {subtext && <p className={SUBTEXT_STYLES}>{subtext}</p>}
    </Card>
  );
}
