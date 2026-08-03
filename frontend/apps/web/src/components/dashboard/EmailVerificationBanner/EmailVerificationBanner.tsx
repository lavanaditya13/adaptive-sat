import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import { resendVerificationEmail } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import { ALERT_STYLES, TITLE_STYLES, DESCRIPTION_STYLES } from './EmailVerificationBanner.styles';
import {
  TITLE,
  DESCRIPTION,
  RESEND_LABEL,
  RESENDING_LABEL,
  RESEND_SUCCESS_TITLE,
  RESEND_SUCCESS_DESCRIPTION,
  RESEND_ERROR_TITLE,
} from './EmailVerificationBanner.constants';

export function EmailVerificationBanner() {
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

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
    <Alert className={ALERT_STYLES}>
      <MailWarning />
      <AlertTitle className={TITLE_STYLES}>{TITLE}</AlertTitle>
      <AlertDescription className={DESCRIPTION_STYLES}>{DESCRIPTION}</AlertDescription>
      <AlertAction>
        <Button type="button" size="sm" variant="outline" disabled={isResending} onClick={handleResend}>
          {isResending ? RESENDING_LABEL : RESEND_LABEL}
        </Button>
      </AlertAction>
    </Alert>
  );
}
