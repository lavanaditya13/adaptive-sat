import { PanelLeft } from 'lucide-react';
import { useAppShellStore } from '@/store/app-shell-store';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs/Breadcrumbs';
import { TOGGLE_SIDEBAR_LABEL } from './Header.constants';
import { DIVIDER_STYLES, HEADER_STYLES, TOGGLE_BUTTON_STYLES } from './Header.styles';

export function Header() {
  const toggleNavigationTrigger = useAppShellStore((state) => state.toggleNavigationTrigger);

  return (
    <header className={HEADER_STYLES}>
      <button
        type="button"
        className={TOGGLE_BUTTON_STYLES}
        aria-label={TOGGLE_SIDEBAR_LABEL}
        title={TOGGLE_SIDEBAR_LABEL}
        onClick={toggleNavigationTrigger}
      >
        <PanelLeft className="size-[17px]" aria-hidden="true" />
      </button>
      <span className={DIVIDER_STYLES} aria-hidden="true" />
      <Breadcrumbs />
    </header>
  );
}
