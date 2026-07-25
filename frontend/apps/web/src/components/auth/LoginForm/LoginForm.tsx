import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { loginSchema, type LoginFormData } from '@/utils/validation-schemas';
import { login } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import { ROUTES } from '@/constants/routes';
import { parseApiError } from '@/utils/parse-api-error';
import { formStyles, inputStyles, buttonStyles, linkStyles } from './LoginForm.styles';
import { TITLE, EMAIL_LABEL, PASSWORD_LABEL, SUBMIT_LABEL, NO_ACCOUNT, SIGNUP_LINK } from './LoginForm.constants';

export function LoginForm() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const [apiError, setApiError] = useState<string | null>(null);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setApiError(null);
      const user = await login(data);
      setUser(user);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      const errorMessage = parseApiError(error);
      setApiError(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6">{TITLE}</h1>

      {apiError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className={formStyles}>
        <div className="space-y-2">
          <Label htmlFor="email">{EMAIL_LABEL}</Label>
          <Input id="email" type="email" {...register('email')} className={inputStyles} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{PASSWORD_LABEL}</Label>
          <Input id="password" type="password" {...register('password')} className={inputStyles} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className={buttonStyles}>
          {isSubmitting ? 'Logging in...' : SUBMIT_LABEL}
        </Button>
      </form>

      <p className="mt-4 text-center">
        {NO_ACCOUNT}{' '}
        <button type="button" onClick={() => navigate(ROUTES.SIGNUP)} className={linkStyles}>
          {SIGNUP_LINK}
        </button>
      </p>
    </div>
  );
}
