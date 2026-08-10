import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
import { PAGE_DESCRIPTION, PAGE_TITLE } from './PracticeConfirmPage.constants';

// Stub: pre-session confirmation. Set `setTrailingCrumbLabel` from the
// app-shell store to name the target in the breadcrumb trail.
export function PracticeConfirmPage() {
  return <PagePlaceholder title={PAGE_TITLE} description={PAGE_DESCRIPTION} />;
}
