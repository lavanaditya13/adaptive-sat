import { useAppShellStore } from '@/store/app-shell-store';
import { TOAST_BOTTOM_DESKTOP, TOAST_BOTTOM_MOBILE } from './Toast.constants';
import { TOAST_STYLES } from './Toast.styles';

/** Transient single-line shell toast; sits above the mobile tab bar. */
export function Toast() {
  const message = useAppShellStore((state) => state.toastMessage);
  const isMobile = useAppShellStore((state) => state.isMobile);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className={TOAST_STYLES}
      style={{ bottom: isMobile ? TOAST_BOTTOM_MOBILE : TOAST_BOTTOM_DESKTOP }}
    >
      {message}
    </div>
  );
}
