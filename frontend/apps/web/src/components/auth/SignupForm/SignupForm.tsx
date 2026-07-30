import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { signupSchema, type SignupFormData } from '@/utils/validation-schemas';
import { signup } from '@/services/auth-service';
import { useAuthStore } from '@/store/auth-store';
import { ROUTES } from '@/constants/routes';
import { getApiErrorDetail } from '@/utils/api-errors';
import { useToast } from '@/components/toast/toast-provider';
import { formStyles, inputStyles, buttonStyles, linkStyles, noteStyles } from './SignupForm.styles';
import {
  TITLE,
  FULL_NAME_LABEL,
  EMAIL_LABEL,
  PASSWORD_LABEL,
  ROLE_LABEL,
  SUBMIT_LABEL,
  HAS_ACCOUNT,
  LOGIN_LINK,
  ROLE_STUDENT,
  ROLE_PARENT,
  ROLE_TUTOR,
  ROLE_NOTE,
} from './SignupForm.constants';

export function SignupForm() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'student',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      const user = await signup(data);
      setUser(user);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      toast({
        title: 'Signup failed',
        description: getApiErrorDetail(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6">{TITLE}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className={formStyles}>
        <div className="space-y-2">
          <Label htmlFor="full_name">{FULL_NAME_LABEL}</Label>
          <Input id="full_name" {...register('full_name')} className={inputStyles} />
          {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
        </div>

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

        <div className="space-y-2">
          <Label>{ROLE_LABEL}</Label>
          <RadioGroup defaultValue="student" {...register('role')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="student" id="student" />
              <Label htmlFor="student">{ROLE_STUDENT}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="parent" id="parent" />
              <Label htmlFor="parent">{ROLE_PARENT}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="tutor" id="tutor" />
              <Label htmlFor="tutor">{ROLE_TUTOR}</Label>
            </div>
          </RadioGroup>
          <p className={noteStyles}>{ROLE_NOTE}</p>
        </div>

        <Button type="submit" disabled={isSubmitting} className={buttonStyles}>
          {isSubmitting ? 'Creating account...' : SUBMIT_LABEL}
        </Button>
      </form>

      <p className="mt-4 text-center">
        {HAS_ACCOUNT}{' '}
        <button type="button" onClick={() => navigate(ROUTES.LOGIN)} className={linkStyles}>
          {LOGIN_LINK}
        </button>
      </p>
    </div>
  );
}
