import { PagePlaceholder } from '@/components/layout/PagePlaceholder/PagePlaceholder';
import { PAGE_DESCRIPTION, PAGE_TITLE } from './PracticeHomePage.constants';

// Stub: per-subject practice home. Route wiring is owned by the app-shell segment.
export function PracticeHomePage() {
  return <PagePlaceholder title={PAGE_TITLE} description={PAGE_DESCRIPTION} />;
}
