import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/toast/toast-provider';
import { ROUTES } from '@/constants/routes';
import {
  CONTAINER_STYLES,
  CARD_STYLES,
  ICON_BADGE_STYLES,
  loadingIconBadgeStyles,
  TITLE_STYLES,
  SUBTITLE_STYLES,
} from './OAuthCallbackPage.styles';
import {
  LOADING_TITLE,
  LOADING_SUBTITLE,
  ERROR_TITLE,
  ERROR_SUBTITLE_DEFAULT,
  ERROR_REASON_ACCESS_DENIED,
  ERROR_REASON_EMAIL_CONFLICT,
  ERROR_REASON_PROVIDER_ERROR,
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
  const { toast } = useToast();
  const statusParam = searchParams.get('status');
  const reasonParam = searchParams.get('reason');
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    const failWithToast = (description: string) => {
      toast({ title: ERROR_TITLE, description, variant: 'destructive' });
      navigate(ROUTES.LOGIN, { replace: true });
    };

    if (statusParam === 'error') {
      failWithToast(reasonParam ? (REASON_MESSAGES[reasonParam] ?? ERROR_SUBTITLE_DEFAULT) : ERROR_SUBTITLE_DEFAULT);
      return;
    }

    getCurrentUser()
      .then((user) => {
        setUser(user);
        navigate(ROUTES.DASHBOARD, { replace: true });
      })
      .catch(() => {
        failWithToast(ERROR_SUBTITLE_DEFAULT);
      });
  }, [statusParam, reasonParam, setUser, navigate, toast]);

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
