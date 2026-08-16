import { useNavigate } from 'react-router-dom';
import { CircleQuestionMark, LogOut, Settings } from 'lucide-react';
import { SUPPORT_TOAST_MESSAGE } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { useLogout } from '@/hooks/use-logout';
import { useAppShellStore } from '@/store/app-shell-store';
import { useAuthStore } from '@/store/auth-store';
import { getDisplayName, getInitials } from '@/utils/user-display';
import {
  HELP_LABEL,
  LOGOUT_LABEL,
  SETTINGS_LABEL,
  SHEET_LABEL,
} from './MobileProfileSheet.constants';
import {
  AVATAR_STYLES,
  EMAIL_STYLES,
  IDENTITY_ROW_STYLES,
  NAME_STYLES,
  OVERLAY_STYLES,
  SHEET_ITEM_STYLES,
  SHEET_LOGOUT_STYLES,
  SHEET_STYLES,
} from './MobileProfileSheet.styles';

export function MobileProfileSheet() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isOpen = useAppShellStore((state) => state.profileSheetOpen);
  const closeProfileSheet = useAppShellStore((state) => state.closeProfileSheet);
  const showToast = useAppShellStore((state) => state.showToast);
  const handleLogout = useLogout();

  if (!isOpen) {
    return null;
  }

  const goToSettings = () => {
    closeProfileSheet();
    navigate(ROUTES.SETTINGS);
  };

  const showSupport = () => {
    closeProfileSheet();
    showToast(SUPPORT_TOAST_MESSAGE);
  };

  return (
    <>
      <div
        className={OVERLAY_STYLES}
        onClick={closeProfileSheet}
        aria-hidden="true"
        data-testid="profile-sheet-overlay"
      />
      <div className={SHEET_STYLES} role="dialog" aria-label={SHEET_LABEL} aria-modal="true">
        <div className={IDENTITY_ROW_STYLES}>
          <span className={AVATAR_STYLES}>{getInitials(user)}</span>
          <div className="min-w-0">
            <p className={NAME_STYLES}>{getDisplayName(user)}</p>
            <p className={EMAIL_STYLES}>{user?.email ?? ''}</p>
          </div>
        </div>

        <button type="button" className={SHEET_ITEM_STYLES} onClick={goToSettings}>
          <Settings className="size-[17px]" aria-hidden="true" />
          {SETTINGS_LABEL}
        </button>
        <button type="button" className={SHEET_ITEM_STYLES} onClick={showSupport}>
          <CircleQuestionMark className="size-[17px]" aria-hidden="true" />
          {HELP_LABEL}
        </button>
        <button type="button" className={SHEET_LOGOUT_STYLES} onClick={handleLogout}>
          <LogOut className="size-[17px]" aria-hidden="true" />
          {LOGOUT_LABEL}
        </button>
      </div>
    </>
  );
}
