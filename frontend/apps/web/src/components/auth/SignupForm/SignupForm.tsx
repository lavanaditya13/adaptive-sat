import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { signupSchema, type SignupFormData } from '@/utils/validation-schemas';
import { signup } from '@/services/auth-service';
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
  NAME_ROW_STYLES,
  inputStyles,
  ERROR_STYLES,
  RADIO_OPTION_STYLES,
  buttonStyles,
  linkStyles,
  noteStyles,
  FOOTER_STYLES,
} from './SignupForm.styles';
import {
  TITLE,
  SUBTITLE,
  FIRST_NAME_LABEL,
  LAST_NAME_LABEL,
  EMAIL_LABEL,
  PASSWORD_LABEL,
  ROLE_LABEL,
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
  HAS_ACCOUNT,
  LOGIN_LINK,
  ROLE_STUDENT,
  ROLE_PARENT,
  ROLE_TUTOR,
  ROLE_NOTE,
  SIGNUP_ERROR_TITLE,
} from './SignupForm.constants';

export function SignupForm() {
  const navigate = useNavigate();
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
      navigate(`${ROUTES.CHECK_EMAIL}?email=${encodeURIComponent(user.email)}`);
    } catch (error) {
      toast({
        title: SIGNUP_ERROR_TITLE,
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
        <OAuthButtons intent="signup" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={formStyles}>
        <div className={NAME_ROW_STYLES}>
          <div className={FIELD_STYLES}>
            <Label htmlFor="first_name">{FIRST_NAME_LABEL}</Label>
            <Input id="first_name" {...register('first_name')} className={inputStyles} />
            {errors.first_name && <p className={ERROR_STYLES}>{errors.first_name.message}</p>}
          </div>

          <div className={FIELD_STYLES}>
            <Label htmlFor="last_name">{LAST_NAME_LABEL}</Label>
            <Input id="last_name" {...register('last_name')} className={inputStyles} />
            {errors.last_name && <p className={ERROR_STYLES}>{errors.last_name.message}</p>}
          </div>
        </div>

        <div className={FIELD_STYLES}>
          <Label htmlFor="email">{EMAIL_LABEL}</Label>
          <Input id="email" type="email" {...register('email')} className={inputStyles} />
          {errors.email && <p className={ERROR_STYLES}>{errors.email.message}</p>}
        </div>

        <div className={FIELD_STYLES}>
          <Label htmlFor="password">{PASSWORD_LABEL}</Label>
          <Input id="password" type="password" {...register('password')} className={inputStyles} />
          {errors.password && <p className={ERROR_STYLES}>{errors.password.message}</p>}
        </div>

        <div className={FIELD_STYLES}>
          <Label>{ROLE_LABEL}</Label>
          <RadioGroup defaultValue="student" {...register('role')}>
            <div className={RADIO_OPTION_STYLES}>
              <RadioGroupItem value="student" id="student" />
              <Label htmlFor="student">{ROLE_STUDENT}</Label>
            </div>
            <div className={RADIO_OPTION_STYLES}>
              <RadioGroupItem value="parent" id="parent" />
              <Label htmlFor="parent">{ROLE_PARENT}</Label>
            </div>
            <div className={RADIO_OPTION_STYLES}>
              <RadioGroupItem value="tutor" id="tutor" />
              <Label htmlFor="tutor">{ROLE_TUTOR}</Label>
            </div>
          </RadioGroup>
          <p className={noteStyles}>{ROLE_NOTE}</p>
        </div>

        <Button type="submit" disabled={isSubmitting} className={buttonStyles}>
          {isSubmitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
        </Button>
      </form>

      <p className={FOOTER_STYLES}>
        {HAS_ACCOUNT}{' '}
        <button type="button" onClick={() => navigate(ROUTES.LOGIN)} className={linkStyles}>
          {LOGIN_LINK}
        </button>
      </p>
    </div>
  );
}
