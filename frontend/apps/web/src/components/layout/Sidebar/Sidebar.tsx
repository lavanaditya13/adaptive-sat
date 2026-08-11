import { NAV_GROUPS } from '@/constants/navigation';
import { useShellNavigation } from '@/hooks/use-shell-navigation';
import { useAppShellStore } from '@/store/app-shell-store';
import { BrandMark } from '@/components/layout/BrandMark';
import { NavItemButton } from '@/components/layout/NavItemButton';
import { UserMenu } from '@/components/layout/UserMenu';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_LABEL,
} from './Sidebar.constants';
import {
  FOOTER_STYLES,
  GROUP_LABEL_STYLES,
  NAV_SCROLL_STYLES,
  SIDEBAR_STYLES,
} from './Sidebar.styles';

export function Sidebar() {
  const isCollapsed = useAppShellStore((state) => state.sidebarCollapsed);
  const { selectNavItem, isActive } = useShellNavigation();

  return (
    <aside
      aria-label={SIDEBAR_LABEL}
      className={SIDEBAR_STYLES}
      style={{ width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
    >
      <BrandMark showWordmark={!isCollapsed} />

      <nav className={NAV_SCROLL_STYLES}>
        {NAV_GROUPS.map((group) => (
          <div key={group.key}>
            {!isCollapsed && <p className={GROUP_LABEL_STYLES}>{group.label}</p>}
            {group.items.map((item) => (
              <NavItemButton
                key={item.key}
                item={item}
                isActive={isActive(item)}
                isCollapsed={isCollapsed}
                onSelect={selectNavItem}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className={FOOTER_STYLES}>
        <UserMenu showIdentity={!isCollapsed} />
      </div>
    </aside>
  );
}
