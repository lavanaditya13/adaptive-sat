import { useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useLogout } from '@/hooks/use-logout';
import { useAppShellStore } from '@/store/app-shell-store';
import { useAuthStore } from '@/store/auth-store';
import { getDisplayName, getInitials } from '@/utils/user-display';
import { LOGOUT_LABEL, MENU_TRIGGER_LABEL, SETTINGS_LABEL } from './UserMenu.constants';
import {
  AVATAR_STYLES,
  CLICK_CATCHER_STYLES,
  EMAIL_STYLES,
  IDENTITY_STYLES,
  NAME_STYLES,
  POPUP_ITEM_STYLES,
  POPUP_LOGOUT_STYLES,
  POPUP_STYLES,
  TRIGGER_STYLES,
} from './UserMenu.styles';

interface UserMenuProps {
  /** Collapsed rail shows the avatar only. */
  showIdentity?: boolean;
}

export function UserMenu({ showIdentity = true }: UserMenuProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isOpen = useAppShellStore((state) => state.userMenuOpen);
  const toggleUserMenu = useAppShellStore((state) => state.toggleUserMenu);
  const closeUserMenu = useAppShellStore((state) => state.closeUserMenu);
  const handleLogout = useLogout();

  const goToSettings = () => {
    closeUserMenu();
    navigate(ROUTES.SETTINGS);
  };

  return (
    <>
      {isOpen && (
        <>
          <div
            className={CLICK_CATCHER_STYLES}
            onClick={closeUserMenu}
            aria-hidden="true"
            data-testid="user-menu-click-catcher"
          />
          <div className={POPUP_STYLES} role="menu">
            <button
              type="button"
              role="menuitem"
              className={POPUP_ITEM_STYLES}
              onClick={goToSettings}
            >
              <Settings className="size-[15px]" aria-hidden="true" />
              {SETTINGS_LABEL}
            </button>
            <button
              type="button"
              role="menuitem"
              className={POPUP_LOGOUT_STYLES}
              onClick={handleLogout}
            >
              <LogOut className="size-[15px]" aria-hidden="true" />
              {LOGOUT_LABEL}
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        className={TRIGGER_STYLES}
        aria-label={MENU_TRIGGER_LABEL}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={toggleUserMenu}
      >
        <span className={AVATAR_STYLES}>{getInitials(user)}</span>
        {showIdentity && (
          <span className={IDENTITY_STYLES}>
            <span className={`block ${NAME_STYLES}`}>{getDisplayName(user)}</span>
            <span className={`block ${EMAIL_STYLES}`}>{user?.email ?? ''}</span>
          </span>
        )}
      </button>
    </>
  );
}
