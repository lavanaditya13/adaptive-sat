import { Card } from '@workspace/ui/components/card';
import { CARD_STYLES, LABEL_STYLES, VALUE_STYLES } from './StatCard.styles';

interface StatCardProps {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className={CARD_STYLES}>
      <p className={LABEL_STYLES}>{label}</p>
      <p className={VALUE_STYLES}>{value}</p>
    </Card>
  );
}
