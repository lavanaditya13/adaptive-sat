import {
  ChartNoAxesColumn,
  CircleQuestionMark,
  House,
  Settings,
  Target,
  User,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from './routes';

export type NavKey = 'dashboard' | 'practice' | 'results' | 'settings' | 'help' | 'profile';

export interface NavItem {
  key: NavKey;
  label: string;
  icon: LucideIcon;
  /** Absent for items that trigger an action instead of navigating (Help, Profile). */
  route?: string;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export const SUPPORT_TOAST_MESSAGE = 'Support: support@scoreup.sat';

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'practice',
    label: 'Practice',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: House, route: ROUTES.DASHBOARD },
      { key: 'practice', label: 'Practice', icon: Target, route: ROUTES.PRACTICE },
      { key: 'results', label: 'Results', icon: ChartNoAxesColumn, route: ROUTES.RESULTS },
    ],
  },
  {
    key: 'account',
    label: 'Account',
    items: [
      { key: 'settings', label: 'Settings', icon: Settings, route: ROUTES.SETTINGS },
      { key: 'help', label: 'Help & Support', icon: CircleQuestionMark },
    ],
  },
];

export const MOBILE_TABS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: House, route: ROUTES.DASHBOARD },
  { key: 'practice', label: 'Practice', icon: Target, route: ROUTES.PRACTICE },
  { key: 'results', label: 'Results', icon: ChartNoAxesColumn, route: ROUTES.RESULTS },
  { key: 'profile', label: 'Profile', icon: User },
];

/** Practice stays highlighted across the whole picker → confirm → session flow. */
export function isNavKeyActive(key: NavKey, pathname: string): boolean {
  switch (key) {
    case 'dashboard':
      return pathname.startsWith(ROUTES.DASHBOARD);
    case 'practice':
      return pathname.startsWith(ROUTES.PRACTICE);
    case 'results':
      return pathname.startsWith(ROUTES.RESULTS);
    case 'settings':
      return pathname.startsWith(ROUTES.SETTINGS);
    default:
      return false;
  }
}
