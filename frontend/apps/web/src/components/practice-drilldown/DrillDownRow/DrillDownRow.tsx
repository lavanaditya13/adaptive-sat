import type { ReactNode } from 'react';
import { AccuracyBadge } from '@/components/practice-drilldown/AccuracyBadge';
import { MasteryPill } from '@/components/practice-drilldown/MasteryPill';
import type { DrilldownAccent } from '@/components/practice-drilldown/drilldown-accent';
import type { SkillTreeNode } from '@/services/skill-tree-service';
import { buildMetaLabel } from './DrillDownRow.constants';
import {
  ACTIONS_STYLES,
  CHIPS_STYLES,
  HEAD_STYLES,
  HEAD_TEXT_STYLES,
  META_STYLES,
  METER_FILL_STYLES,
  METER_TRACK_STYLES,
  ROW_SELECTABLE_STYLES,
  ROW_STYLES,
  TITLE_BUTTON_STYLES,
  TITLE_COMPACT_STYLES,
  TITLE_ROW_STYLES,
  TITLE_STYLES,
} from './DrillDownRow.styles';

interface DrillDownRowProps {
  node: SkillTreeNode;
  accent: DrilldownAccent;
  /** Skill rows sit one level down and use the smaller title size. */
  compact?: boolean;
  /** Makes the whole card clickable; the title also becomes a focusable target. */
  onSelect?: () => void;
  chips?: ReactNode;
  actions?: ReactNode;
}

/**
 * One domain or skill card: name, mastery indicator, attempt count, accuracy
 * badge, accuracy meter, optional chips and actions. Shared by both the
 * domains and the skills screen so the two levels read identically.
 */
export function DrillDownRow({
  node,
  accent,
  compact = false,
  onSelect,
  chips,
  actions,
}: DrillDownRowProps) {
  const meterWidth = node.questionsAttempted > 0 ? `${node.accuracy}%` : '0%';

  return (
    <div
      className={`${ROW_STYLES} ${onSelect ? ROW_SELECTABLE_STYLES : ''}`}
      onClick={onSelect}
    >
      <div className={HEAD_STYLES}>
        <div className={HEAD_TEXT_STYLES}>
          <div className={TITLE_ROW_STYLES}>
            {onSelect ? (
              <button
                type="button"
                className={`${compact ? TITLE_COMPACT_STYLES : TITLE_STYLES} ${TITLE_BUTTON_STYLES}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect();
                }}
              >
                {node.name}
              </button>
            ) : (
              <p className={compact ? TITLE_COMPACT_STYLES : TITLE_STYLES}>{node.name}</p>
            )}
            <MasteryPill mastered={node.mastered} questionsAttempted={node.questionsAttempted} />
          </div>
          <p className={META_STYLES}>{buildMetaLabel(node.questionsAttempted)}</p>
        </div>
        <AccuracyBadge accuracy={node.accuracy} questionsAttempted={node.questionsAttempted} />
      </div>

      <div className={METER_TRACK_STYLES}>
        <div
          className={`${METER_FILL_STYLES} ${accent.bar}`}
          style={{ width: meterWidth }}
        />
      </div>

      {chips && <div className={CHIPS_STYLES}>{chips}</div>}

      {actions && (
        <div className={ACTIONS_STYLES} onClick={(event) => event.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
