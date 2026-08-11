import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { Skeleton } from '@workspace/ui/components/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { ConfidenceSelector } from '@/components/practice/ConfidenceSelector/ConfidenceSelector';
import { QuestionCard } from '@/components/practice/QuestionCard/QuestionCard';
import { QuestionNavPanel } from '@/components/practice/QuestionNavPanel/QuestionNavPanel';
import { SessionHeader } from '@/components/practice/SessionHeader/SessionHeader';
import { SessionNavigation } from '@/components/practice/SessionNavigation/SessionNavigation';
import { useNavigationGuard } from '@/hooks/use-navigation-guard';
import { useAppShellStore } from '@/store/app-shell-store';
import {
  END_SESSION_BUTTON_LABEL,
  EXIT_DIALOG_CANCEL,
  EXIT_DIALOG_CONFIRM,
  EXIT_DIALOG_DESCRIPTION,
  EXIT_DIALOG_TITLE,
  PAUSED_DESCRIPTION,
  PAUSED_TITLE,
  RESUME_BUTTON_LABEL,
  RESUME_ERROR_DESCRIPTION,
  RESUME_ERROR_TITLE,
  RESUME_RETRY_LABEL,
  REVIEW_BANNER_TEXT,
} from './QuestionsPage.constants';
import {
  CONTAINER_STYLES,
  ERROR_BANNER_STYLES,
  PAUSED_ACTIONS_STYLES,
  PAUSED_DESCRIPTION_STYLES,
  PAUSED_END_BUTTON_STYLES,
  PAUSED_PANEL_STYLES,
  PAUSED_RESUME_BUTTON_STYLES,
  PAUSED_TITLE_STYLES,
  RESUME_ERROR_DESCRIPTION_STYLES,
  RESUME_ERROR_PANEL_STYLES,
  RESUME_ERROR_TITLE_STYLES,
  RESUME_RETRY_BUTTON_STYLES,
  REVIEW_BANNER_STYLES,
  REVIEW_BANNER_TEXT_STYLES,
  SKELETON_HEADER_STYLES,
  SKELETON_OPTION_STYLES,
  SKELETON_PROMPT_STYLES,
} from './QuestionsPage.styles';
import { useQuestionSession } from './use-question-session';

export function QuestionsPage() {
  const session = useQuestionSession();
  const setTrailingCrumbLabel = useAppShellStore((state) => state.setTrailingCrumbLabel);

  const { showExitDialog, confirmNavigation, handleConfirmExit, handleCancelExit } =
    useNavigationGuard(session.hasActiveSession && !session.isSubmitting);

  // The session target isn't in the URL, so the breadcrumb can't derive it.
  const topicLabel = session.question?.topic_display_name ?? null;

  useEffect(() => {
    setTrailingCrumbLabel(topicLabel);

    return () => setTrailingCrumbLabel(null);
  }, [setTrailingCrumbLabel, topicLabel]);

  if (session.status === 'loading') {
    return (
      <div className={CONTAINER_STYLES}>
        <Skeleton className={SKELETON_HEADER_STYLES} />
        <Skeleton className={SKELETON_PROMPT_STYLES} />
        <Skeleton className={SKELETON_OPTION_STYLES} />
        <Skeleton className={SKELETON_OPTION_STYLES} />
        <Skeleton className={SKELETON_OPTION_STYLES} />
      </div>
    );
  }

  if (session.status === 'resume-error') {
    return (
      <div className={CONTAINER_STYLES}>
        <div className={RESUME_ERROR_PANEL_STYLES}>
          <h1 className={RESUME_ERROR_TITLE_STYLES}>{RESUME_ERROR_TITLE}</h1>
          <p className={RESUME_ERROR_DESCRIPTION_STYLES}>{RESUME_ERROR_DESCRIPTION}</p>
          <button
            type="button"
            onClick={session.retryLoad}
            className={RESUME_RETRY_BUTTON_STYLES}
          >
            <RotateCcw className="mr-2 inline size-[15px]" aria-hidden="true" />
            {RESUME_RETRY_LABEL}
          </button>
        </div>
      </div>
    );
  }

  if (!session.question) {
    return null;
  }

  return (
    <div className={CONTAINER_STYLES}>
      <SessionHeader
        currentPosition={session.viewPosition}
        totalQuestions={session.totalQuestions}
        questionSeconds={session.questionSeconds}
        sessionSeconds={session.sessionSeconds}
        segments={session.segments}
        accent={session.accent}
        isPaused={session.isPaused}
        onOpenNav={session.openNav}
        onTogglePause={session.togglePause}
      />

      {session.isPaused ? (
        <div className={PAUSED_PANEL_STYLES}>
          <h2 className={PAUSED_TITLE_STYLES}>{PAUSED_TITLE}</h2>
          <p className={PAUSED_DESCRIPTION_STYLES}>{PAUSED_DESCRIPTION}</p>
          <div className={PAUSED_ACTIONS_STYLES}>
            <button
              type="button"
              onClick={session.togglePause}
              className={cn(PAUSED_RESUME_BUTTON_STYLES, session.accent.buttonBg)}
            >
              {RESUME_BUTTON_LABEL}
            </button>
            <button
              type="button"
              onClick={() => confirmNavigation(() => void session.endSession())}
              className={PAUSED_END_BUTTON_STYLES}
            >
              {END_SESSION_BUTTON_LABEL}
            </button>
          </div>
        </div>
      ) : (
        <>
          {session.isReviewing && (
            <div className={REVIEW_BANNER_STYLES}>
              <RotateCcw className="size-3.5 shrink-0 text-warning" aria-hidden="true" />
              <span className={REVIEW_BANNER_TEXT_STYLES}>{REVIEW_BANNER_TEXT}</span>
            </div>
          )}

          {session.errorMessage && (
            <p className={ERROR_BANNER_STYLES} role="alert">
              {session.errorMessage}
            </p>
          )}

          <QuestionCard
            question={session.question}
            selectedAnswer={session.selectedAnswer}
            onSelectAnswer={session.selectAnswer}
            accent={session.accent}
            disabled={session.isReviewing || session.isSubmitting}
          />

          <ConfidenceSelector
            confidenceLevel={session.confidence}
            onSelectConfidence={session.selectConfidence}
            accent={session.accent}
            disabled={session.isReviewing || session.isSubmitting}
          />

          <SessionNavigation
            hasPrevious={session.hasPrevious}
            canGoNext={session.canGoNext}
            showSkip={session.showSkip}
            nextLabel={session.nextLabel}
            isSubmitting={session.isSubmitting}
            accent={session.accent}
            onPrevious={session.goPrevious}
            onSkip={session.skipQuestion}
            onNext={session.goNext}
          />
        </>
      )}

      <QuestionNavPanel
        open={session.isNavOpen}
        items={session.navItems}
        accent={session.accent}
        isMobile={session.isMobile}
        onSelect={session.jumpToQuestion}
        onClose={session.closeNav}
      />

      <Dialog open={showExitDialog} onOpenChange={handleCancelExit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{EXIT_DIALOG_TITLE}</DialogTitle>
            <DialogDescription>{EXIT_DIALOG_DESCRIPTION}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelExit}>
              {EXIT_DIALOG_CANCEL}
            </Button>
            <Button variant="destructive" onClick={handleConfirmExit}>
              {EXIT_DIALOG_CONFIRM}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
