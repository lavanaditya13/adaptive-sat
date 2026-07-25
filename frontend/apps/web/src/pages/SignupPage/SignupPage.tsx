import { SignupForm } from '@/components/auth/SignupForm/SignupForm';
import { CONTAINER_STYLES } from './SignupPage.constants';

export function SignupPage() {
  return (
    <div className={CONTAINER_STYLES}>
      <SignupForm />
    </div>
  );
}
