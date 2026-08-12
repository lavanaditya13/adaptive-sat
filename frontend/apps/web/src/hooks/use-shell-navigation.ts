import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SUPPORT_TOAST_MESSAGE, isNavKeyActive, type NavItem } from '@/constants/navigation';
import { useAppShellStore } from '@/store/app-shell-store';

/**
 * Shared behaviour for every nav surface (sidebar, mobile drawer, tab bar):
 * route items navigate and dismiss overlays, Help toasts, Profile opens the
 * mobile sheet.
 */
export function useShellNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const closeAllOverlays = useAppShellStore((state) => state.closeAllOverlays);
  const toggleProfileSheet = useAppShellStore((state) => state.toggleProfileSheet);
  const showToast = useAppShellStore((state) => state.showToast);

  const selectNavItem = useCallback(
    (item: NavItem) => {
      if (item.key === 'profile') {
        toggleProfileSheet();
        return;
      }

      closeAllOverlays();

      if (item.key === 'help') {
        showToast(SUPPORT_TOAST_MESSAGE);
        return;
      }

      if (item.route) {
        navigate(item.route);
      }
    },
    [closeAllOverlays, navigate, showToast, toggleProfileSheet]
  );

  const isActive = useCallback((item: NavItem) => isNavKeyActive(item.key, pathname), [pathname]);

  return { pathname, selectNavItem, isActive };
}
