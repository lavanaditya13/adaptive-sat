import { LogOut } from 'lucide-react';
import { NAV_GROUPS } from '@/constants/navigation';
import { useLogout } from '@/hooks/use-logout';
import { useShellNavigation } from '@/hooks/use-shell-navigation';
import { useAppShellStore } from '@/store/app-shell-store';
import { BrandMark } from '@/components/layout/BrandMark/BrandMark';
import { NavItemButton } from '@/components/layout/NavItemButton/NavItemButton';
import { DRAWER_LABEL, LOGOUT_LABEL } from './MobileSidebarDrawer.constants';
import {
  DRAWER_STYLES,
  FOOTER_STYLES,
  GROUP_LABEL_STYLES,
  LOGOUT_STYLES,
  NAV_SCROLL_STYLES,
  OVERLAY_STYLES,
} from './MobileSidebarDrawer.styles';

export function MobileSidebarDrawer() {
  const isOpen = useAppShellStore((state) => state.mobileSidebarOpen);
  const closeMobileSidebar = useAppShellStore((state) => state.closeMobileSidebar);
  const { selectNavItem, isActive } = useShellNavigation();
  const handleLogout = useLogout();

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={OVERLAY_STYLES}
        onClick={closeMobileSidebar}
        aria-hidden="true"
        data-testid="mobile-sidebar-overlay"
      />
      <div className={DRAWER_STYLES} role="dialog" aria-label={DRAWER_LABEL} aria-modal="true">
        <BrandMark />

        <nav className={NAV_SCROLL_STYLES}>
          {NAV_GROUPS.map((group) => (
            <div key={group.key}>
              <p className={GROUP_LABEL_STYLES}>{group.label}</p>
              {group.items.map((item) => (
                <NavItemButton
                  key={item.key}
                  item={item}
                  isActive={isActive(item)}
                  onSelect={selectNavItem}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className={FOOTER_STYLES}>
          <button type="button" className={LOGOUT_STYLES} onClick={handleLogout}>
            <LogOut className="size-[15px]" aria-hidden="true" />
            {LOGOUT_LABEL}
          </button>
        </div>
      </div>
    </>
  );
}
