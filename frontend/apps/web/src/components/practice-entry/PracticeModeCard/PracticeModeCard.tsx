import { AccuracyRing } from '../AccuracyRing/AccuracyRing';
import type { PracticeAccent } from '../practice-accent';
import {
  ACCURACY_BADGE_STYLES,
  formatAccuracy,
  getAccuracyTone,
} from '../practice-entry.utils';
import type { PracticeOption } from '@/types/api';
import {
  ACCURACY_BADGE_SUFFIX,
  LOCKED_LABEL,
  LOCK_ICON,
  MODE_ICONS,
  MODE_TITLES,
  NO_ATTEMPTS_BADGE,
  START_ADAPTIVE_LABEL,
  START_LABEL,
  getModeDescription,
  getUnlockMessage,
} from './PracticeModeCard.constants';
import {
  BADGE_STYLES,
  BADGE_TEXT_STYLES,
  CARD_BODY_STYLES,
  CARD_FOOTER_STYLES,
  CARD_HEAD_STYLES,
  CARD_LOCKED_BORDER_STYLES,
  CARD_STYLES,
  DESCRIPTION_STYLES,
  ICON_TILE_LOCKED_STYLES,
  ICON_TILE_STYLES,
  LOCKED_BUTTON_STYLES,
  START_BUTTON_STYLES,
  TITLE_STYLES,
} from './PracticeModeCard.styles';

interface PracticeModeCardProps {
  option: PracticeOption;
  accent: PracticeAccent;
  /** Section accuracy, or null when the student has not attempted anything yet. */
  accuracy: number | null;
  domainsCount: number;
  onStart: (option: PracticeOption) => void;
}

/**
 * One backend-supplied practice mode (`section` or `adaptive`). The lock state,
 * and the number of sessions still required, come straight from the API's
 * `is_locked` / `unlock_requirement` — the gate is never computed client-side.
 */
export function PracticeModeCard({
  option,
  accent,
  accuracy,
  domainsCount,
  onStart,
}: PracticeModeCardProps) {
  const isLocked = option.is_locked;
  const Icon = isLocked ? LOCK_ICON : MODE_ICONS[option.mode];
  const title = MODE_TITLES[option.mode] ?? option.title;

  const roundedAccuracy = accuracy === null ? null : formatAccuracy(accuracy);
  const showRing = !isLocked && roundedAccuracy !== null;

  const unlockMessage = option.unlock_requirement
    ? getUnlockMessage(
        option.unlock_requirement.remaining_sessions,
        option.unlock_requirement.required_sessions
      )
    : null;

  const description = isLocked && unlockMessage
    ? unlockMessage
    : getModeDescription(option.mode, domainsCount);

  return (
    <div
      className={`${CARD_STYLES} ${isLocked ? CARD_LOCKED_BORDER_STYLES : accent.border}`}
      data-testid={`practice-mode-${option.mode}`}
    >
      <div className={CARD_BODY_STYLES}>
        <div className={CARD_HEAD_STYLES}>
          <div
            className={`${ICON_TILE_STYLES} ${isLocked ? ICON_TILE_LOCKED_STYLES : accent.tileSoft}`}
          >
            <Icon
              className={`size-[18px] ${isLocked ? 'text-ink-muted' : accent.text}`}
              aria-hidden="true"
            />
          </div>

          {showRing && (
            <AccuracyRing
              value={roundedAccuracy}
              strokeClassName={accent.ringStroke}
              labelClassName={accent.text}
              label={`${roundedAccuracy}% section accuracy`}
            />
          )}
        </div>

        <h3 className={TITLE_STYLES}>{title}</h3>
        <p className={DESCRIPTION_STYLES}>{description}</p>
      </div>

      <div className={CARD_FOOTER_STYLES}>
        {isLocked ? (
          <span className={`${BADGE_TEXT_STYLES} border-hairline-strong bg-white/5 text-ink-muted`}>
            {`${option.unlock_requirement?.completed_sessions ?? 0} / ${option.unlock_requirement?.required_sessions ?? 0} sessions`}
          </span>
        ) : (
          <span
            className={
              roundedAccuracy === null
                ? `${BADGE_TEXT_STYLES} border-hairline-strong bg-white/5 text-ink-muted`
                : `${BADGE_STYLES} ${ACCURACY_BADGE_STYLES[getAccuracyTone(roundedAccuracy)]}`
            }
          >
            {roundedAccuracy === null
              ? NO_ATTEMPTS_BADGE
              : `${roundedAccuracy}${ACCURACY_BADGE_SUFFIX}`}
          </span>
        )}

        {isLocked ? (
          <div className={LOCKED_BUTTON_STYLES} aria-disabled="true">
            <LOCK_ICON className="size-[15px]" aria-hidden="true" />
            {LOCKED_LABEL}
          </div>
        ) : (
          <button
            type="button"
            className={`${START_BUTTON_STYLES} ${accent.button}`}
            onClick={() => onStart(option)}
          >
            {option.mode === 'adaptive' ? START_ADAPTIVE_LABEL : START_LABEL}
          </button>
        )}
      </div>
    </div>
  );
}
