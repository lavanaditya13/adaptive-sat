import { create } from 'zustand';

export const MOBILE_MEDIA_QUERY = '(max-width: 900px)';
const TOAST_DURATION_MS = 2600;

function matchesMobile(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

interface AppShellStore {
  isMobile: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  profileSheetOpen: boolean;
  userMenuOpen: boolean;
  toastMessage: string | null;
  /** Overrides the last breadcrumb for screens whose target isn't in the URL
   *  (practice confirm, session runner). Pages set it on mount, clear on unmount. */
  trailingCrumbLabel: string | null;

  setIsMobile: (isMobile: boolean) => void;
  setTrailingCrumbLabel: (label: string | null) => void;
  toggleSidebar: () => void;
  /** Header/mobile trigger: collapses the rail on desktop, opens the drawer on mobile. */
  toggleNavigationTrigger: () => void;
  closeMobileSidebar: () => void;
  toggleProfileSheet: () => void;
  closeProfileSheet: () => void;
  toggleUserMenu: () => void;
  closeUserMenu: () => void;
  /** Called on every navigation so no overlay survives a route change. */
  closeAllOverlays: () => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
}

let toastTimeoutId: ReturnType<typeof setTimeout> | undefined;

export const useAppShellStore = create<AppShellStore>((set, get) => ({
  isMobile: matchesMobile(),
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  profileSheetOpen: false,
  userMenuOpen: false,
  toastMessage: null,
  trailingCrumbLabel: null,

  setIsMobile: (isMobile) => set({ isMobile }),
  setTrailingCrumbLabel: (label) => set({ trailingCrumbLabel: label }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleNavigationTrigger: () => {
    if (get().isMobile) {
      set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen }));
      return;
    }

    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  toggleProfileSheet: () => set((state) => ({ profileSheetOpen: !state.profileSheetOpen })),
  closeProfileSheet: () => set({ profileSheetOpen: false }),
  toggleUserMenu: () => set((state) => ({ userMenuOpen: !state.userMenuOpen })),
  closeUserMenu: () => set({ userMenuOpen: false }),
  closeAllOverlays: () =>
    set({ mobileSidebarOpen: false, profileSheetOpen: false, userMenuOpen: false }),

  showToast: (message) => {
    clearTimeout(toastTimeoutId);
    set({ toastMessage: message });
    toastTimeoutId = setTimeout(() => set({ toastMessage: null }), TOAST_DURATION_MS);
  },
  dismissToast: () => {
    clearTimeout(toastTimeoutId);
    set({ toastMessage: null });
  },
}));

/**
 * Keeps `isMobile` in sync with the 900px breakpoint. Returns an unsubscribe
 * callback; call from a single mount point (AppShell).
 */
export function subscribeToMobileBreakpoint(): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  const handleChange = () => useAppShellStore.getState().setIsMobile(mediaQuery.matches);

  handleChange();
  mediaQuery.addEventListener('change', handleChange);

  return () => mediaQuery.removeEventListener('change', handleChange);
}
