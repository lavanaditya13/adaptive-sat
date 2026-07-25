import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { ScoreSummary } from '@/components/practice/ScoreSummary/ScoreSummary';
import { useResultsStore } from '@/store/results-store';
import { ROUTES } from '@/constants/routes';
import {
  PAGE_TITLE,
  SUBTITLE,
  EMPTY_TITLE,
  EMPTY_DESCRIPTION,
  BACK_TO_DASHBOARD_BUTTON,
  START_NEW_PRACTICE_BUTTON,
} from './ResultsPage.constants';
import {
  CONTAINER_STYLES,
  HEADER_CONTAINER_STYLES,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  EMPTY_CARD_STYLES,
  CTA_CONTAINER_STYLES,
  CTA_BUTTON_STYLES,
} from './ResultsPage.styles';

export function ResultsPage() {
  const navigate = useNavigate();
  const latestResult = useResultsStore((state) => state.latestResult);

  if (!latestResult) {
    return (
      <div className={CONTAINER_STYLES}>
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
      <div className={HEADER_CONTAINER_STYLES}>
        <h1 className={TITLE_STYLES}>{PAGE_TITLE}</h1>
        <p className={SUBTITLE_STYLES}>{SUBTITLE}</p>
      </div>

      <ScoreSummary result={latestResult} />

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
