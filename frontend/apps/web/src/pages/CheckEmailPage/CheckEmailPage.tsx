import { useState } from 'react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { resendVerificationEmailByEmail } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import { ROUTES } from '@/constants/routes';
import {
  CONTAINER_STYLES,
  CARD_STYLES,
  ICON_BADGE_STYLES,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  ACTIONS_STYLES,
  linkStyles,
} from './CheckEmailPage.styles';
import {
  TITLE,
  SUBTITLE,
  RESEND_LABEL,
  RESENDING_LABEL,
  RESEND_SUCCESS_TITLE,
  RESEND_SUCCESS_DESCRIPTION,
  RESEND_ERROR_TITLE,
  BACK_TO_LOGIN_LABEL,
} from './CheckEmailPage.constants';

export function CheckEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const email = useMemo(() => (searchParams.get('email') || '').trim(), [searchParams]);

  const handleResend = async () => {
    if (!email) {
      toast({
        title: RESEND_ERROR_TITLE,
        description: 'Missing email context. Please sign up again.',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);
    try {
      await resendVerificationEmailByEmail(email);
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
        <div className={ICON_BADGE_STYLES}>
          <MailCheck className="size-6" />
        </div>
        <h1 className={TITLE_STYLES}>{TITLE}</h1>
        <p className={SUBTITLE_STYLES}>{SUBTITLE}</p>

        <div className={ACTIONS_STYLES}>
          <Button type="button" variant="outline" disabled={isResending} onClick={handleResend}>
            {isResending ? RESENDING_LABEL : RESEND_LABEL}
          </Button>
          <button type="button" onClick={() => navigate(ROUTES.LOGIN)} className={linkStyles}>
            {BACK_TO_LOGIN_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
