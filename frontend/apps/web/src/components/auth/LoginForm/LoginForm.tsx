import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { loginSchema, type LoginFormData } from '@/utils/validation-schemas';
import { login } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import { ROUTES } from '@/constants/routes';
import { getApiErrorDetail } from '@/utils/api-errors';
import { useToast } from '@/components/toast/toast-provider';
import { OAuthButtons } from '@/components/auth/OAuthButtons/OAuthButtons';
import {
  CARD_STYLES,
  TITLE_STYLES,
  SUBTITLE_STYLES,
  OAUTH_SECTION_STYLES,
  formStyles,
  FIELD_STYLES,
  inputStyles,
  ERROR_STYLES,
  LABEL_ROW_STYLES,
  forgotPasswordStyles,
  buttonStyles,
  linkStyles,
  FOOTER_STYLES,
} from './LoginForm.styles';
import {
  TITLE,
  SUBTITLE,
  EMAIL_LABEL,
  PASSWORD_LABEL,
  FORGOT_PASSWORD_LABEL,
  FORGOT_PASSWORD_BUTTON_ARIA_LABEL,
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
  NO_ACCOUNT,
  SIGNUP_LINK,
  LOGIN_ERROR_TITLE,
} from './LoginForm.constants';

export function LoginForm() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const user = await login(data);
      setUser(user);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      toast({
        title: LOGIN_ERROR_TITLE,
        description: getApiErrorDetail(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={CARD_STYLES}>
      <h1 className={TITLE_STYLES}>{TITLE}</h1>
      <p className={SUBTITLE_STYLES}>{SUBTITLE}</p>

      <div className={OAUTH_SECTION_STYLES}>
        <OAuthButtons intent="login" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={formStyles}>
        <div className={FIELD_STYLES}>
          <Label htmlFor="email">{EMAIL_LABEL}</Label>
          <Input id="email" type="email" {...register('email')} className={inputStyles} />
          {errors.email && <p className={ERROR_STYLES}>{errors.email.message}</p>}
        </div>

        <div className={FIELD_STYLES}>
          <div className={LABEL_ROW_STYLES}>
            <Label htmlFor="password">{PASSWORD_LABEL}</Label>
            <button
              type="button"
              onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
              className={forgotPasswordStyles}
              aria-label={FORGOT_PASSWORD_BUTTON_ARIA_LABEL}
            >
              {FORGOT_PASSWORD_LABEL}
            </button>
          </div>
          <Input id="password" type="password" {...register('password')} className={inputStyles} />
          {errors.password && <p className={ERROR_STYLES}>{errors.password.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className={buttonStyles}>
          {isSubmitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
        </Button>
      </form>

      <p className={FOOTER_STYLES}>
        {NO_ACCOUNT}{' '}
        <button type="button" onClick={() => navigate(ROUTES.SIGNUP)} className={linkStyles}>
          {SIGNUP_LINK}
        </button>
      </p>
    </div>
  );
}
