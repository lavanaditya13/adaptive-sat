import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { SubjectCard } from '@/components/practice-entry/SubjectCard/SubjectCard';
import { useSectionSummaries } from '@/components/practice-entry/use-practice-entry';
import { practicePath } from '@/constants/routes';
import { getApiErrorDetail } from '@/utils/api-errors';
import {
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  ERROR_TITLE,
  PAGE_DESCRIPTION,
  PAGE_TITLE,
} from './PracticeSubjectPage.constants';
import {
  CONTAINER_STYLES,
  DESCRIPTION_STYLES,
  GRID_STYLES,
  HEADER_STYLES,
  PANEL_STYLES,
  PANEL_TITLE_STYLES,
  SKELETON_CARD_STYLES,
  TITLE_STYLES,
} from './PracticeSubjectPage.styles';

/**
 * Subject picker at `/practice`.
 *
 * Section accuracy, questions completed and domain counts all come from the
 * dashboard endpoint, which returns every section in a single response — the
 * skill tree would need one request per section for the same numbers.
 */
export function PracticeSubjectPage() {
  const navigate = useNavigate();
  const { sections, isLoading, error } = useSectionSummaries();

  const handleSelect = (sectionName: string) => {
    navigate(practicePath.subject(sectionName));
  };

  return (
    <div className={CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <h1 className={TITLE_STYLES}>{PAGE_TITLE}</h1>
        <p className={DESCRIPTION_STYLES}>{PAGE_DESCRIPTION}</p>
      </div>

      {isLoading && (
        <div className={GRID_STYLES}>
          <Skeleton className={SKELETON_CARD_STYLES} />
          <Skeleton className={SKELETON_CARD_STYLES} />
        </div>
      )}

      {!isLoading && error && (
        <div className={PANEL_STYLES}>
          <h2 className={PANEL_TITLE_STYLES}>{ERROR_TITLE}</h2>
          <p className="m-0">{getApiErrorDetail(error)}</p>
        </div>
      )}

      {!isLoading && !error && sections.length === 0 && (
        <div className={PANEL_STYLES}>
          <h2 className={PANEL_TITLE_STYLES}>{EMPTY_TITLE}</h2>
          <p className="m-0">{EMPTY_DESCRIPTION}</p>
        </div>
      )}

      {!isLoading && !error && sections.length > 0 && (
        <div className={GRID_STYLES}>
          {sections.map((section) => (
            <SubjectCard key={section.section_id} section={section} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
