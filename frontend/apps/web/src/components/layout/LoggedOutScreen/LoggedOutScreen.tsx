import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { CTA_LABEL, SUBTITLE, TITLE } from './LoggedOutScreen.constants';
import {
  CONTAINER_STYLES,
  CTA_STYLES,
  ICON_STYLES,
  SUBTITLE_STYLES,
  TITLE_STYLES,
} from './LoggedOutScreen.styles';

export function LoggedOutScreen() {
  const navigate = useNavigate();

  return (
    <div className={CONTAINER_STYLES}>
      <div className="text-center">
        <div className={ICON_STYLES}>
          <LogOut className="size-6" aria-hidden="true" />
        </div>
        <h1 className={TITLE_STYLES}>{TITLE}</h1>
        <p className={SUBTITLE_STYLES}>{SUBTITLE}</p>
        <button
          type="button"
          className={CTA_STYLES}
          onClick={() => navigate(ROUTES.LOGIN, { replace: true })}
        >
          {CTA_LABEL}
        </button>
      </div>
    </div>
  );
}
