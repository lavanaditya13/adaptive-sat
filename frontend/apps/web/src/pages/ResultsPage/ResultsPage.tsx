import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { ResultsSummaryCard } from '@/components/results/ResultsSummaryCard/ResultsSummaryCard';
import { QuestionBreakdownAccordion } from '@/components/results/QuestionBreakdownAccordion/QuestionBreakdownAccordion';
import { sumTimeSpentSeconds } from '@/components/results/resultsFormat';
import { useResultsStore } from '@/store/results-store';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES, practicePath } from '@/constants/routes';
import {
  EMPTY_TITLE,
  EMPTY_DESCRIPTION,
  BACK_TO_DASHBOARD_BUTTON,
  TRY_AGAIN_BUTTON,
} from './ResultsPage.constants';
import {
  CONTAINER_STYLES,
  EMPTY_CONTAINER_STYLES,
  EMPTY_CARD_STYLES,
  EMPTY_TITLE_STYLES,
  EMPTY_DESCRIPTION_STYLES,
  CTA_CONTAINER_STYLES,
  CTA_BUTTON_STYLES,
} from './ResultsPage.styles';

export function ResultsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const latestResult = useResultsStore((state) => state.latestResult);

  // Belt-and-suspenders alongside the invalidation in PracticePage: this
  // page can also be reached via a refresh or deep link that skipped that
  // completion callback, so the dashboard cache must be invalidated here too.
  const handleBackToDashboard = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    navigate(ROUTES.DASHBOARD);
  };

  const handleTryAgain = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    navigate(latestResult?.section ? practicePath.subject(latestResult.section) : ROUTES.PRACTICE);
  };

  // A completed session's summary lives only in this in-memory store (set by
  // the practice flow right after POST /practice/complete resolves). There is
  // no "fetch my last result" endpoint, so a direct/refreshed visit with
  // nothing in the store is a genuine "no completed session" case, not a
  // loading or error state - route the student back into practice instead.
  if (!latestResult) {
    return (
      <div className={EMPTY_CONTAINER_STYLES}>
        <Card className={EMPTY_CARD_STYLES}>
          <h2 className={EMPTY_TITLE_STYLES}>{EMPTY_TITLE}</h2>
          <p className={EMPTY_DESCRIPTION_STYLES}>{EMPTY_DESCRIPTION}</p>
          <Button className={CTA_BUTTON_STYLES} onClick={handleBackToDashboard}>
            {BACK_TO_DASHBOARD_BUTTON}
          </Button>
        </Card>
      </div>
    );
  }

  const timeTakenSeconds = sumTimeSpentSeconds(latestResult.question_breakdown);

  return (
    <div className={CONTAINER_STYLES}>
      <ResultsSummaryCard result={latestResult} timeTakenSeconds={timeTakenSeconds} />

      <QuestionBreakdownAccordion items={latestResult.question_breakdown} />

      <div className={CTA_CONTAINER_STYLES}>
        <Button variant="outline" className={CTA_BUTTON_STYLES} onClick={handleTryAgain}>
          {TRY_AGAIN_BUTTON}
        </Button>
        <Button className={CTA_BUTTON_STYLES} onClick={handleBackToDashboard}>
          {BACK_TO_DASHBOARD_BUTTON}
        </Button>
      </div>
    </div>
  );
}
