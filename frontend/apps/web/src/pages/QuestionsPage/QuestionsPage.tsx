import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
import { PAGE_DESCRIPTION, PAGE_TITLE } from './QuestionsPage.constants';

// Stub: session runner, replaces the legacy PracticePage. Set
// `setTrailingCrumbLabel` from the app-shell store to name the topic.
export function QuestionsPage() {
  return <PagePlaceholder title={PAGE_TITLE} description={PAGE_DESCRIPTION} />;
}
