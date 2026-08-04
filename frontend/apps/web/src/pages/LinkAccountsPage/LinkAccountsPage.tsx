import { useNavigate } from 'react-router-dom';
import { OAuthButtons } from '@/components/auth/OAuthButtons/OAuthButtons';
import { ROUTES } from '@/constants/routes';
import {
  CONTAINER_STYLES,
  CARD_STYLES,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  buttonsWrapperStyles,
  linkStyles,
} from './LinkAccountsPage.styles';
import { TITLE, SUBTITLE, BACK_TO_SETTINGS_LABEL } from './LinkAccountsPage.constants';

export function LinkAccountsPage() {
  const navigate = useNavigate();

  return (
    <div className={CONTAINER_STYLES}>
      <div className={CARD_STYLES}>
        <h1 className={TITLE_STYLES}>{TITLE}</h1>
        <p className={SUBTITLE_STYLES}>{SUBTITLE}</p>

        <div className={buttonsWrapperStyles}>
          <OAuthButtons intent="link" showDivider={false} />
        </div>

        <button type="button" onClick={() => navigate(ROUTES.SETTINGS)} className={linkStyles}>
          {BACK_TO_SETTINGS_LABEL}
        </button>
      </div>
    </div>
  );
}
