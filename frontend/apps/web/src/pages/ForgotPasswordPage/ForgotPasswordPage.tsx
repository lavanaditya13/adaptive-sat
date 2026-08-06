import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { requestPasswordReset } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import { ROUTES } from '@/constants/routes';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/utils/validation-schemas';
import {
  CONTAINER_STYLES,
  CARD_STYLES,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  FORM_STYLES,
  FIELD_STYLES,
  SUBMIT_BUTTON_STYLES,
  LINK_STYLES,
} from './ForgotPasswordPage.styles';
import {
  TITLE,
  SUBTITLE,
  EMAIL_LABEL,
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
  BACK_TO_LOGIN_LABEL,
  RESET_LINK_SENT_TITLE,
  RESET_LINK_SENT_DESCRIPTION,
  RESET_LINK_ERROR_TITLE,
} from './ForgotPasswordPage.constants';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await requestPasswordReset(data.email);
      toast({
        title: RESET_LINK_SENT_TITLE,
        description: RESET_LINK_SENT_DESCRIPTION,
        variant: 'success',
      });
      navigate(ROUTES.LOGIN);
    } catch (error) {
      toast({
        title: RESET_LINK_ERROR_TITLE,
        description: getApiErrorDetail(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={CONTAINER_STYLES}>
      <div className={CARD_STYLES}>
        <h1 className={TITLE_STYLES}>{TITLE}</h1>
        <p className={SUBTITLE_STYLES}>{SUBTITLE}</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className={FORM_STYLES}>
          <div className={FIELD_STYLES}>
            <Label htmlFor="forgot-password-email">{EMAIL_LABEL}</Label>
            <Input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className={SUBMIT_BUTTON_STYLES}>
            {isSubmitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
          </Button>
        </form>

        <button type="button" onClick={() => navigate(ROUTES.LOGIN)} className={LINK_STYLES}>
          {BACK_TO_LOGIN_LABEL}
        </button>
      </div>
    </div>
  );
}
