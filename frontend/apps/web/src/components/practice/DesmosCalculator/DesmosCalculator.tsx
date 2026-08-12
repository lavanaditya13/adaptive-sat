import { useCallback, useEffect, useRef, useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { DialogContent, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { loadDesmosScript, type DesmosCalculatorInstance } from '@/utils/load-desmos-script';
import {
  CALCULATOR_BUTTON_LABEL,
  CALCULATOR_DIALOG_TITLE,
  CLOSE_BUTTON_LABEL,
  DESMOS_TABS,
  GRAPHING_CALCULATOR_OPTIONS,
  LOADING_MESSAGE,
  LOAD_ERROR_MESSAGE,
  RETRY_BUTTON_LABEL,
  SCIENTIFIC_CALCULATOR_OPTIONS,
  type DesmosTabId,
} from './DesmosCalculator.constants';
import {
  BACKDROP_STYLES,
  CALCULATOR_CONTAINER_HIDDEN_STYLES,
  CALCULATOR_CONTAINER_STYLES,
  CALCULATOR_STAGE_STYLES,
  CLOSE_BUTTON_STYLES,
  DIALOG_CONTENT_STYLES,
  HEADER_ROW_STYLES,
  OVERLAY_BASE_STYLES,
  OVERLAY_CLOSED_STYLES,
  OVERLAY_OPEN_STYLES,
  RETRY_BUTTON_STYLES,
  STATUS_OVERLAY_STYLES,
  STATUS_TEXT_STYLES,
  TABS_ROW_STYLES,
  TAB_BUTTON_ACTIVE_STYLES,
  TAB_BUTTON_BASE_STYLES,
  TAB_BUTTON_INACTIVE_STYLES,
  TOGGLE_BUTTON_STYLES,
} from './DesmosCalculator.styles';

/**
 * Self-contained calculator launcher: an icon button plus its own dialog,
 * mounted once at the session level (SessionHeader) rather than per
 * question. QuestionCard swaps out on every question navigation, so a
 * calculator instance living there would be destroyed and recreated,
 * wiping out anything the student graphed -- this component (and the
 * Desmos instances it owns) instead lives for the lifetime of the whole
 * practice session, unaffected by which question is on screen, matching how
 * the real digital-SAT Bluebook calculator behaves.
 */
export function DesmosCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DesmosTabId>('graphing');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const graphingContainerRef = useRef<HTMLDivElement>(null);
  const scientificContainerRef = useRef<HTMLDivElement>(null);
  const graphingCalculatorRef = useRef<DesmosCalculatorInstance | null>(null);
  const scientificCalculatorRef = useRef<DesmosCalculatorInstance | null>(null);
  const hasInitializedRef = useRef(false);

  const initializeCalculators = useCallback(async () => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;
    setIsLoading(true);
    setLoadError(null);

    try {
      const Desmos = await loadDesmosScript();

      if (graphingContainerRef.current && !graphingCalculatorRef.current) {
        graphingCalculatorRef.current = Desmos.GraphingCalculator(
          graphingContainerRef.current,
          GRAPHING_CALCULATOR_OPTIONS
        );
      }
      if (scientificContainerRef.current && !scientificCalculatorRef.current) {
        scientificCalculatorRef.current = Desmos.ScientificCalculator(
          scientificContainerRef.current,
          SCIENTIFIC_CALCULATOR_OPTIONS
        );
      }
    } catch {
      // Allow the student to retry (e.g. after reconnecting) instead of
      // permanently wedging the dialog in a broken state.
      hasInitializedRef.current = false;
      setLoadError(LOAD_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only destroy Desmos's internal resources when the owning component
  // actually unmounts (the student leaves the practice session) -- never on
  // dialog close, so state graphed by the student survives close/reopen.
  useEffect(() => {
    return () => {
      graphingCalculatorRef.current?.destroy();
      scientificCalculatorRef.current?.destroy();
      graphingCalculatorRef.current = null;
      scientificCalculatorRef.current = null;
    };
  }, []);

  // Instantiate lazily -- only the first time the student actually opens the
  // dialog -- and only once per session; reopening after a close is a no-op
  // guarded by hasInitializedRef inside initializeCalculators. Triggered
  // directly from the click handler rather than an effect keyed on `isOpen`
  // so the async load never has to synchronously set state from an effect.
  const handleOpen = () => {
    setIsOpen(true);
    void initializeCalculators();
  };
  const handleClose = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={CALCULATOR_BUTTON_LABEL}
        className={TOGGLE_BUTTON_STYLES}
      >
        <Calculator className="size-[13px]" aria-hidden="true" />
      </button>

      {/* Deliberately not the shared `Dialog` component: that one
          conditionally unmounts its children when closed, which would tear
          down the Desmos containers below and lose the student's graph.
          Visibility is toggled with a CSS class instead so the DOM (and the
          Desmos instances bound to it) stays mounted for the whole session. */}
      <div
        className={cn(OVERLAY_BASE_STYLES, isOpen ? OVERLAY_OPEN_STYLES : OVERLAY_CLOSED_STYLES)}
        role="dialog"
        aria-modal="true"
        aria-label={CALCULATOR_DIALOG_TITLE}
      >
        <div className={BACKDROP_STYLES} onClick={handleClose} />

        <DialogContent className={DIALOG_CONTENT_STYLES}>
          <DialogHeader>
            <div className={HEADER_ROW_STYLES}>
              <DialogTitle>{CALCULATOR_DIALOG_TITLE}</DialogTitle>
              <button
                type="button"
                onClick={handleClose}
                aria-label={CLOSE_BUTTON_LABEL}
                className={CLOSE_BUTTON_STYLES}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </DialogHeader>

          <div className={TABS_ROW_STYLES}>
            {DESMOS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={cn(
                  TAB_BUTTON_BASE_STYLES,
                  activeTab === tab.id ? TAB_BUTTON_ACTIVE_STYLES : TAB_BUTTON_INACTIVE_STYLES
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={CALCULATOR_STAGE_STYLES}>
            <div
              ref={graphingContainerRef}
              className={cn(
                CALCULATOR_CONTAINER_STYLES,
                activeTab !== 'graphing' && CALCULATOR_CONTAINER_HIDDEN_STYLES
              )}
            />
            <div
              ref={scientificContainerRef}
              className={cn(
                CALCULATOR_CONTAINER_STYLES,
                activeTab !== 'scientific' && CALCULATOR_CONTAINER_HIDDEN_STYLES
              )}
            />

            {isLoading && !loadError && (
              <div className={STATUS_OVERLAY_STYLES}>
                <p className={STATUS_TEXT_STYLES}>{LOADING_MESSAGE}</p>
              </div>
            )}

            {loadError && (
              <div className={STATUS_OVERLAY_STYLES} role="alert">
                <p className={STATUS_TEXT_STYLES}>{loadError}</p>
                <button
                  type="button"
                  onClick={() => void initializeCalculators()}
                  className={RETRY_BUTTON_STYLES}
                >
                  {RETRY_BUTTON_LABEL}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </div>
    </>
  );
}
