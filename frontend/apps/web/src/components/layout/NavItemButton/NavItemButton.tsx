import type { NavItem } from '@/constants/navigation';
import {
  NAV_ICON_STYLES,
  NAV_ITEM_ACTIVE_STYLES,
  NAV_ITEM_COLLAPSED_STYLES,
  NAV_ITEM_IDLE_STYLES,
  NAV_ITEM_STYLES,
  NAV_LABEL_STYLES,
} from './NavItemButton.styles';

interface NavItemButtonProps {
  item: NavItem;
  isActive: boolean;
  /** Collapsed rail: icon only, label survives as the title tooltip. */
  isCollapsed?: boolean;
  onSelect: (item: NavItem) => void;
}

export function NavItemButton({
  item,
  isActive,
  isCollapsed = false,
  onSelect,
}: NavItemButtonProps) {
  const Icon = item.icon;
  const stateStyles = isActive ? NAV_ITEM_ACTIVE_STYLES : NAV_ITEM_IDLE_STYLES;
  const layoutStyles = isCollapsed ? NAV_ITEM_COLLAPSED_STYLES : '';

  return (
    <button
      type="button"
      title={item.label}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(item)}
      className={`${NAV_ITEM_STYLES} ${stateStyles} ${layoutStyles}`}
    >
      <span className={NAV_ICON_STYLES}>
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      {isCollapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className={NAV_LABEL_STYLES}>{item.label}</span>
      )}
    </button>
  );
}
