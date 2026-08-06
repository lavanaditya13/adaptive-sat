import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { resetPassword } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import { ROUTES } from '@/constants/routes';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/utils/validation-schemas';
import {
  CONTAINER_STYLES,
  CARD_STYLES,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  FORM_STYLES,
  FIELD_STYLES,
  SUBMIT_BUTTON_STYLES,
  LINK_STYLES,
} from './ResetPasswordPage.styles';
import {
  TITLE,
  SUBTITLE,
  MISSING_TOKEN_TITLE,
  MISSING_TOKEN_SUBTITLE,
  NEW_PASSWORD_LABEL,
  CONFIRM_PASSWORD_LABEL,
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
  BACK_TO_LOGIN_LABEL,
  MISSING_TOKEN_TOAST_TITLE,
  MISSING_TOKEN_TOAST_DESCRIPTION,
  PASSWORD_UPDATED_TITLE,
  PASSWORD_UPDATED_DESCRIPTION,
  RESET_ERROR_TITLE,
} from './ResetPasswordPage.constants';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast({
        title: MISSING_TOKEN_TOAST_TITLE,
        description: MISSING_TOKEN_TOAST_DESCRIPTION,
        variant: 'destructive',
      });
      return;
    }

    try {
      await resetPassword(token, data.password);
      toast({
        title: PASSWORD_UPDATED_TITLE,
        description: PASSWORD_UPDATED_DESCRIPTION,
        variant: 'success',
      });
      navigate(ROUTES.LOGIN);
    } catch (error) {
      toast({
        title: RESET_ERROR_TITLE,
        description: getApiErrorDetail(error),
        variant: 'destructive',
      });
    }
  };

  if (!token) {
    return (
      <div className={CONTAINER_STYLES}>
        <div className={CARD_STYLES}>
          <h1 className={TITLE_STYLES}>{MISSING_TOKEN_TITLE}</h1>
          <p className={SUBTITLE_STYLES}>{MISSING_TOKEN_SUBTITLE}</p>
          <button type="button" onClick={() => navigate(ROUTES.LOGIN)} className={LINK_STYLES}>
            {BACK_TO_LOGIN_LABEL}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={CONTAINER_STYLES}>
      <div className={CARD_STYLES}>
        <h1 className={TITLE_STYLES}>{TITLE}</h1>
        <p className={SUBTITLE_STYLES}>{SUBTITLE}</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className={FORM_STYLES}>
          <div className={FIELD_STYLES}>
            <Label htmlFor="new-password">{NEW_PASSWORD_LABEL}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className={FIELD_STYLES}>
            <Label htmlFor="confirm-password">{CONFIRM_PASSWORD_LABEL}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className={SUBMIT_BUTTON_STYLES}>
            {isSubmitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
          </Button>
        </form>
      </div>
    </div>
  );
}
