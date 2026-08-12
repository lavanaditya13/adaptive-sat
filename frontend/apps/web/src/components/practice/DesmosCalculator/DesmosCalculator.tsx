import { useCallback, useEffect, useRef, useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
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
  CALCULATOR_CONTAINER_HIDDEN_STYLES,
  CALCULATOR_CONTAINER_STYLES,
  CALCULATOR_STAGE_STYLES,
  CLICK_OUTSIDE_STYLES,
  CLOSE_BUTTON_STYLES,
  HEADER_ROW_STYLES,
  PANEL_HIDDEN_STYLES,
  PANEL_STYLES,
  PANEL_TITLE_STYLES,
  PANEL_VISIBLE_STYLES,
  RETRY_BUTTON_STYLES,
  SHELL_BASE_STYLES,
  SHELL_CLOSED_STYLES,
  SHELL_OPEN_STYLES,
  STATUS_OVERLAY_STYLES,
  STATUS_TEXT_STYLES,
  TABS_ROW_STYLES,
  TAB_BUTTON_ACTIVE_STYLES,
  TAB_BUTTON_BASE_STYLES,
  TAB_BUTTON_INACTIVE_STYLES,
  TRIGGER_BUTTON_HIDDEN_STYLES,
  TRIGGER_BUTTON_STYLES,
  TRIGGER_BUTTON_VISIBLE_STYLES,
} from './DesmosCalculator.styles';

/**
 * Self-contained calculator launcher: a floating icon that morphs in place
 * into the full calculator, mounted once at the session level (SessionHeader)
 * rather than per question. QuestionCard swaps out on every question
 * navigation, so a calculator instance living there would be destroyed and
 * recreated, wiping out anything the student graphed -- this component (and
 * the Desmos instances it owns) instead lives for the lifetime of the whole
 * practice session, unaffected by which question is on screen, matching how
 * the real digital-SAT Bluebook calculator behaves.
 *
 * There's no separate dialog/backdrop: a single fixed shell element animates
 * its own width/height/border-radius between a small circular trigger and
 * the full panel size (see DesmosCalculator.styles.ts), so it visually reads
 * as the button itself growing into the calculator -- the same "expand in
 * place" feel as iOS's AssistiveTouch bubble -- instead of a modal popping
 * up over the page.
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
      // permanently wedging the panel in a broken state.
      hasInitializedRef.current = false;
      setLoadError(LOAD_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only destroy Desmos's internal resources when the owning component
  // actually unmounts (the student leaves the practice session) -- never on
  // close, so state graphed by the student survives close/reopen.
  useEffect(() => {
    return () => {
      graphingCalculatorRef.current?.destroy();
      scientificCalculatorRef.current?.destroy();
      graphingCalculatorRef.current = null;
      scientificCalculatorRef.current = null;
    };
  }, []);

  // Instantiate lazily -- only the first time the student actually opens the
  // panel -- and only once per session; reopening after a close is a no-op
  // guarded by hasInitializedRef inside initializeCalculators. Triggered
  // directly from the click handler rather than an effect keyed on `isOpen`
  // so the async load never has to synchronously set state from an effect.
  const handleOpen = () => {
    setIsOpen(true);
    void initializeCalculators();
  };
  const handleClose = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className={CLICK_OUTSIDE_STYLES} onClick={handleClose} aria-hidden="true" />
      )}

      <div
        className={cn(SHELL_BASE_STYLES, isOpen ? SHELL_OPEN_STYLES : SHELL_CLOSED_STYLES)}
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label={isOpen ? CALCULATOR_DIALOG_TITLE : undefined}
      >
        <button
          type="button"
          onClick={handleOpen}
          aria-label={CALCULATOR_BUTTON_LABEL}
          tabIndex={isOpen ? -1 : 0}
          className={cn(
            TRIGGER_BUTTON_STYLES,
            isOpen ? TRIGGER_BUTTON_HIDDEN_STYLES : TRIGGER_BUTTON_VISIBLE_STYLES
          )}
        >
          <Calculator className="size-5" aria-hidden="true" />
        </button>

        {/* Fixed-size regardless of the shell's own animated size (see
            PANEL_STYLES) -- only clipping and opacity change, so the Desmos
            containers below never observe a resize from this open/close
            animation. `inert` while closed keeps the whole subtree
            (including Desmos's own internal focusable DOM, which we don't
            control) out of focus/pointer reach, on top of the visual
            opacity + pointer-events-none. */}
        <div
          className={cn(PANEL_STYLES, isOpen ? PANEL_VISIBLE_STYLES : PANEL_HIDDEN_STYLES)}
          inert={!isOpen}
        >
          <div className={HEADER_ROW_STYLES}>
            <h2 className={PANEL_TITLE_STYLES}>{CALCULATOR_DIALOG_TITLE}</h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label={CLOSE_BUTTON_LABEL}
              className={CLOSE_BUTTON_STYLES}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

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
        </div>
      </div>
    </>
  );
}
