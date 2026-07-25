import { LoginForm } from '@/components/auth/LoginForm/LoginForm';
import { CONTAINER_STYLES } from './LoginPage.constants';

export function LoginPage() {
  return (
    <div className={CONTAINER_STYLES}>
      <LoginForm />
    </div>
  );
}
