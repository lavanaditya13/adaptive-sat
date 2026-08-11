import { MOBILE_TABS } from '@/constants/navigation';
import { useShellNavigation } from '@/hooks/use-shell-navigation';
import { TAB_BAR_LABEL } from './MobileTabBar.constants';
import {
  TAB_ACTIVE_STYLES,
  TAB_BAR_STYLES,
  TAB_ICON_STYLES,
  TAB_IDLE_STYLES,
  TAB_LABEL_STYLES,
  TAB_STYLES,
} from './MobileTabBar.styles';

export function MobileTabBar() {
  const { selectNavItem, isActive } = useShellNavigation();

  return (
    <nav aria-label={TAB_BAR_LABEL} className={TAB_BAR_STYLES}>
      {MOBILE_TABS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);

        return (
          <button
            key={item.key}
            type="button"
            aria-current={active ? 'page' : undefined}
            className={`${TAB_STYLES} ${active ? TAB_ACTIVE_STYLES : TAB_IDLE_STYLES}`}
            onClick={() => selectNavItem(item)}
          >
            <span className={TAB_ICON_STYLES}>
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <span className={TAB_LABEL_STYLES}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
