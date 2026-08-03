import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { verifyEmail, resendVerificationEmail } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import { ROUTES } from '@/constants/routes';
import {
  CONTAINER_STYLES,
  CARD_STYLES,
  ICON_BADGE_STYLES,
  successIconBadgeStyles,
  errorIconBadgeStyles,
  loadingIconBadgeStyles,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  ACTIONS_STYLES,
  linkStyles,
} from './VerifyEmailPage.styles';
import {
  LOADING_TITLE,
  LOADING_SUBTITLE,
  SUCCESS_TITLE,
  SUCCESS_SUBTITLE,
  ERROR_TITLE,
  ERROR_SUBTITLE_MISSING_TOKEN,
  RESEND_LABEL,
  RESENDING_LABEL,
  RESEND_SUCCESS_TITLE,
  RESEND_SUCCESS_DESCRIPTION,
  RESEND_ERROR_TITLE,
  BACK_TO_LOGIN_LABEL,
  REDIRECT_DELAY_MS,
} from './VerifyEmailPage.constants';

type VerifyStatus = 'loading' | 'success' | 'error';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const { toast } = useToast();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<VerifyStatus>(() => (token ? 'loading' : 'error'));
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    token ? null : ERROR_SUBTITLE_MISSING_TOKEN
  );
  const [isResending, setIsResending] = useState(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    if (!token) {
      return;
    }

    verifyEmail(token)
      .then((user) => {
        setUser(user);
        setStatus('success');
        window.setTimeout(() => navigate(ROUTES.DASHBOARD), REDIRECT_DELAY_MS);
      })
      .catch((error) => {
        setStatus('error');
        setErrorMessage(getApiErrorDetail(error));
      });
  }, [token, setUser, navigate]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail();
      toast({ title: RESEND_SUCCESS_TITLE, description: RESEND_SUCCESS_DESCRIPTION, variant: 'success' });
    } catch (error) {
      toast({ title: RESEND_ERROR_TITLE, description: getApiErrorDetail(error), variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={CONTAINER_STYLES}>
      <div className={CARD_STYLES}>
        {status === 'loading' && (
          <>
            <div className={`${ICON_BADGE_STYLES} ${loadingIconBadgeStyles}`}>
              <Loader2 className="size-6 animate-spin" />
            </div>
            <h1 className={TITLE_STYLES}>{LOADING_TITLE}</h1>
            <p className={SUBTITLE_STYLES}>{LOADING_SUBTITLE}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={`${ICON_BADGE_STYLES} ${successIconBadgeStyles}`}>
              <CheckCircle2 className="size-6" />
            </div>
            <h1 className={TITLE_STYLES}>{SUCCESS_TITLE}</h1>
            <p className={SUBTITLE_STYLES}>{SUCCESS_SUBTITLE}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={`${ICON_BADGE_STYLES} ${errorIconBadgeStyles}`}>
              <XCircle className="size-6" />
            </div>
            <h1 className={TITLE_STYLES}>{ERROR_TITLE}</h1>
            <p className={SUBTITLE_STYLES}>{errorMessage}</p>

            <div className={ACTIONS_STYLES}>
              <Button type="button" variant="outline" disabled={isResending} onClick={handleResend}>
                {isResending ? RESENDING_LABEL : RESEND_LABEL}
              </Button>
              <button type="button" onClick={() => navigate(ROUTES.LOGIN)} className={linkStyles}>
                {BACK_TO_LOGIN_LABEL}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
