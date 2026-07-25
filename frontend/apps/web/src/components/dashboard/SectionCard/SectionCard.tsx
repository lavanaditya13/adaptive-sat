import { useNavigate } from 'react-router-dom';
import { Card } from '@workspace/ui/components/card';
import { CARD_STYLES, TITLE_STYLES, DESCRIPTION_STYLES } from './SectionCard.styles';
import { ROUTES } from '@/constants/routes';

interface Section {
  section_id: number;
  name: string;
  display_name: string;
}

interface SectionCardProps {
  section: Section;
}

export function SectionCard({ section }: SectionCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(ROUTES.SECTION_DETAIL(section.section_id));
  };

  return (
    <Card className={CARD_STYLES} onClick={handleClick}>
      <h3 className={TITLE_STYLES}>{section.display_name}</h3>
      <p className={DESCRIPTION_STYLES}>{section.name}</p>
    </Card>
  );
}
