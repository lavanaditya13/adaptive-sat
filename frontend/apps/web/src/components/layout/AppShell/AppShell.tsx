import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { subscribeToMobileBreakpoint, useAppShellStore } from '@/store/app-shell-store';
import { Header } from '@/components/layout/Header/Header';
import { MobileProfileSheet } from '@/components/layout/MobileProfileSheet/MobileProfileSheet';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer/MobileSidebarDrawer';
import { MobileTabBar } from '@/components/layout/MobileTabBar/MobileTabBar';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import { Toast } from '@/components/layout/Toast/Toast';
import {
  CONTENT_BOTTOM_PADDING_DESKTOP,
  CONTENT_BOTTOM_PADDING_MOBILE,
  CONTENT_MARGIN_DESKTOP,
  CONTENT_MARGIN_MOBILE,
} from './AppShell.constants';
import {
  CONTENT_PANEL_STYLES,
  CONTENT_SCROLL_STYLES,
  SHELL_STYLES,
} from './AppShell.styles';

/** Layout route: chrome around every authenticated screen. */
export function AppShell() {
  const isMobile = useAppShellStore((state) => state.isMobile);

  useEffect(() => subscribeToMobileBreakpoint(), []);

  return (
    <div className={SHELL_STYLES}>
      {!isMobile && <Sidebar />}

      <div
        className={CONTENT_PANEL_STYLES}
        style={{ margin: isMobile ? CONTENT_MARGIN_MOBILE : CONTENT_MARGIN_DESKTOP }}
      >
        <Header />
        <div
          className={CONTENT_SCROLL_STYLES}
          style={{
            paddingBottom: isMobile
              ? CONTENT_BOTTOM_PADDING_MOBILE
              : CONTENT_BOTTOM_PADDING_DESKTOP,
          }}
        >
          <Outlet />
        </div>
      </div>

      {isMobile && <MobileTabBar />}
      <MobileSidebarDrawer />
      <MobileProfileSheet />
      <Toast />
    </div>
  );
}
