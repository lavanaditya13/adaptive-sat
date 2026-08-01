import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { ScoreSummary } from '@/components/practice/ScoreSummary/ScoreSummary';
import { QuestionBreakdownList } from '@/components/practice/QuestionBreakdownList/QuestionBreakdownList';
import { useResultsStore } from '@/store/results-store';
import { ROUTES } from '@/constants/routes';
import {
  EMPTY_TITLE,
  EMPTY_DESCRIPTION,
  BACK_TO_DASHBOARD_BUTTON,
  START_NEW_PRACTICE_BUTTON,
} from './ResultsPage.constants';
import {
  CONTAINER_STYLES,
  EMPTY_CONTAINER_STYLES,
  EMPTY_CARD_STYLES,
  CTA_CONTAINER_STYLES,
  CTA_BUTTON_STYLES,
} from './ResultsPage.styles';

export function ResultsPage() {
  const navigate = useNavigate();
  const latestResult = useResultsStore((state) => state.latestResult);

  if (!latestResult) {
    return (
      <div className={EMPTY_CONTAINER_STYLES}>
        <Card className={EMPTY_CARD_STYLES}>
          <h2 className="text-xl font-semibold">{EMPTY_TITLE}</h2>
          <p className="text-sm text-muted-foreground">{EMPTY_DESCRIPTION}</p>
          <Button
            className={CTA_BUTTON_STYLES}
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            {BACK_TO_DASHBOARD_BUTTON}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={CONTAINER_STYLES}>
      <ScoreSummary result={latestResult} />

      <QuestionBreakdownList
        items={latestResult.question_breakdown}
        section={latestResult.section}
      />

      <div className={CTA_CONTAINER_STYLES}>
        <Button
          className={CTA_BUTTON_STYLES}
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          {BACK_TO_DASHBOARD_BUTTON}
        </Button>
        <Button
          variant="outline"
          className={CTA_BUTTON_STYLES}
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          {START_NEW_PRACTICE_BUTTON}
        </Button>
      </div>
    </div>
  );
}
