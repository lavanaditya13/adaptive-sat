import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { ResultsSummaryCard } from '@/components/results/ResultsSummaryCard/ResultsSummaryCard';
import { QuestionBreakdownAccordion } from '@/components/results/QuestionBreakdownAccordion/QuestionBreakdownAccordion';
import { sumTimeSpentSeconds } from '@/components/results/resultsFormat';
import { getLatestResult } from '@/services/practice-service';
import { useResultsStore } from '@/store/results-store';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES, practicePath } from '@/constants/routes';
import {
  LOADING_LABEL,
  ERROR_TITLE,
  ERROR_DESCRIPTION,
  RETRY_BUTTON,
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
  SKELETON_SUMMARY_STYLES,
  SKELETON_ROW_STYLES,
  SKELETON_LIST_STYLES,
} from './ResultsPage.styles';

export function ResultsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storedResult = useResultsStore((state) => state.latestResult);

  // The Results tab is reachable without having just finished a session — a
  // direct link, a refresh, a different device — and the store is per-tab and
  // in-memory, so it is empty in all of those cases. Fetching the last
  // completed session from the server is what makes the tab work at all
  // outside the finish-a-session flow.
  const {
    data: fetchedResult,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.practice.latestResult,
    queryFn: getLatestResult,
  });

  // Store first: it holds the session the student just finished, so arriving
  // straight from the practice flow renders immediately with no fetch flash.
  // It cannot be staler than the server's answer — the only thing that writes
  // it is a completion, which is by definition the latest result.
  const result = storedResult ?? fetchedResult ?? null;

  // Belt-and-suspenders alongside the invalidation in the practice flow: this
  // page can also be reached via a refresh or deep link that skipped that
  // completion callback, so the dashboard cache must be invalidated here too.
  const handleBackToDashboard = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    navigate(ROUTES.DASHBOARD);
  };

  const handleTryAgain = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    navigate(result?.section ? practicePath.subject(result.section) : ROUTES.PRACTICE);
  };

  if (!result && isPending) {
    return (
      <div className={CONTAINER_STYLES} aria-busy="true" aria-label={LOADING_LABEL}>
        <Skeleton className={SKELETON_SUMMARY_STYLES} />
        <div className={SKELETON_LIST_STYLES}>
          <Skeleton className={SKELETON_ROW_STYLES} />
          <Skeleton className={SKELETON_ROW_STYLES} />
          <Skeleton className={SKELETON_ROW_STYLES} />
        </div>
      </div>
    );
  }

  // A failed fetch is not the same as "no results" — say so, and offer a
  // retry, rather than telling the student they have never practised.
  if (!result && isError) {
    return (
      <div className={EMPTY_CONTAINER_STYLES}>
        <Card className={EMPTY_CARD_STYLES}>
          <h2 className="text-lg font-bold text-ink">{ERROR_TITLE}</h2>
          <p className="text-sm text-ink-muted">{ERROR_DESCRIPTION}</p>
          <div className={CTA_CONTAINER_STYLES}>
            <Button variant="outline" className={CTA_BUTTON_STYLES} onClick={() => refetch()}>
              {RETRY_BUTTON}
            </Button>
            <Button className={CTA_BUTTON_STYLES} onClick={handleBackToDashboard}>
              {BACK_TO_DASHBOARD_BUTTON}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Nothing in the store and the server has no completed session either — a
  // genuine "never finished a practice session" case.
  if (!result) {
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

  const timeTakenSeconds = sumTimeSpentSeconds(result.question_breakdown);

  return (
    <div className={CONTAINER_STYLES}>
      <ResultsSummaryCard result={result} timeTakenSeconds={timeTakenSeconds} />

      <QuestionBreakdownAccordion items={result.question_breakdown} />

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
