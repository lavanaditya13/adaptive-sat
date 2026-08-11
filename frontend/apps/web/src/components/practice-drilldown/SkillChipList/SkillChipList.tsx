import { buildMoreChipLabel, MAX_VISIBLE_CHIPS, NO_SKILLS_LABEL, splitChips } from './SkillChipList.constants';
import {
  CHIP_LIST_STYLES,
  CHIP_STYLES,
  EMPTY_STYLES,
  MORE_CHIP_STYLES,
} from './SkillChipList.styles';

interface SkillChipListProps {
  skillNames: string[];
  maxVisible?: number;
}

/** Preview of what a domain contains: a few skill chips plus a `+N more` roll-up. */
export function SkillChipList({ skillNames, maxVisible = MAX_VISIBLE_CHIPS }: SkillChipListProps) {
  if (skillNames.length === 0) {
    return <p className={EMPTY_STYLES}>{NO_SKILLS_LABEL}</p>;
  }

  const { visible, hiddenCount } = splitChips(skillNames, maxVisible);

  return (
    <div className={CHIP_LIST_STYLES}>
      {visible.map((name) => (
        <span key={name} className={CHIP_STYLES} title={name}>
          {name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className={MORE_CHIP_STYLES}>{buildMoreChipLabel(hiddenCount)}</span>
      )}
    </div>
  );
}
