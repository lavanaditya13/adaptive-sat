import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import { getCurrentUser } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import { ROUTES } from '@/constants/routes';
import {
  CONTAINER_STYLES,
  CARD_STYLES,
  ICON_BADGE_STYLES,
  loadingIconBadgeStyles,
  errorIconBadgeStyles,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  linkStyles,
} from './OAuthCallbackPage.styles';
import {
  LOADING_TITLE,
  LOADING_SUBTITLE,
  ERROR_TITLE,
  ERROR_SUBTITLE_DEFAULT,
  ERROR_REASON_ACCESS_DENIED,
  ERROR_REASON_EMAIL_CONFLICT,
  ERROR_REASON_PROVIDER_ERROR,
  BACK_TO_LOGIN_LABEL,
  REDIRECT_DELAY_MS,
} from './OAuthCallbackPage.constants';

const REASON_MESSAGES: Record<string, string> = {
  access_denied: ERROR_REASON_ACCESS_DENIED,
  email_conflict: ERROR_REASON_EMAIL_CONFLICT,
  provider_error: ERROR_REASON_PROVIDER_ERROR,
};

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const statusParam = searchParams.get('status');
  const reasonParam = searchParams.get('reason');
  const [hasError, setHasError] = useState(() => statusParam === 'error');
  const hasRunRef = useRef(false);

  const errorMessage = reasonParam ? (REASON_MESSAGES[reasonParam] ?? ERROR_SUBTITLE_DEFAULT) : ERROR_SUBTITLE_DEFAULT;

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    if (statusParam === 'error') {
      return;
    }

    getCurrentUser()
      .then((user) => {
        setUser(user);
        window.setTimeout(() => navigate(ROUTES.DASHBOARD), REDIRECT_DELAY_MS);
      })
      .catch(() => {
        setHasError(true);
      });
  }, [statusParam, setUser, navigate]);

  if (hasError) {
    return (
      <div className={CONTAINER_STYLES}>
        <div className={CARD_STYLES}>
          <div className={`${ICON_BADGE_STYLES} ${errorIconBadgeStyles}`}>
            <XCircle className="size-6" />
          </div>
          <h1 className={TITLE_STYLES}>{ERROR_TITLE}</h1>
          <p className={SUBTITLE_STYLES}>{errorMessage}</p>
          <button type="button" onClick={() => navigate(ROUTES.LOGIN)} className={linkStyles}>
            {BACK_TO_LOGIN_LABEL}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={CONTAINER_STYLES}>
      <div className={CARD_STYLES}>
        <div className={`${ICON_BADGE_STYLES} ${loadingIconBadgeStyles}`}>
          <Loader2 className="size-6 animate-spin" />
        </div>
        <h1 className={TITLE_STYLES}>{LOADING_TITLE}</h1>
        <p className={SUBTITLE_STYLES}>{LOADING_SUBTITLE}</p>
      </div>
    </div>
  );
}
