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
  formStyles,
  inputStyles,
  LABEL_ROW_STYLES,
  forgotPasswordStyles,
  buttonStyles,
  linkStyles,
} from './LoginForm.styles';
import {
  TITLE,
  SUBTITLE,
  EMAIL_LABEL,
  PASSWORD_LABEL,
  FORGOT_PASSWORD_LABEL,
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
  NO_ACCOUNT,
  SIGNUP_LINK,
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
        title: 'Login failed',
        description: getApiErrorDetail(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={CARD_STYLES}>
      <h1 className={TITLE_STYLES}>{TITLE}</h1>
      <p className={SUBTITLE_STYLES}>{SUBTITLE}</p>

      <div className="mt-6">
        <OAuthButtons intent="login" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={formStyles}>
        <div className="space-y-2">
          <Label htmlFor="email">{EMAIL_LABEL}</Label>
          <Input id="email" type="email" {...register('email')} className={inputStyles} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className={LABEL_ROW_STYLES}>
            <Label htmlFor="password">{PASSWORD_LABEL}</Label>
            <span className={forgotPasswordStyles} aria-disabled="true">
              {FORGOT_PASSWORD_LABEL}
            </span>
          </div>
          <Input id="password" type="password" {...register('password')} className={inputStyles} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className={buttonStyles}>
          {isSubmitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {NO_ACCOUNT}{' '}
        <button type="button" onClick={() => navigate(ROUTES.SIGNUP)} className={linkStyles}>
          {SIGNUP_LINK}
        </button>
      </p>
    </div>
  );
}
