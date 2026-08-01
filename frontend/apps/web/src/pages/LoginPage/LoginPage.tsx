import { LoginForm } from '@/components/auth/LoginForm/LoginForm';
import { LoginHero } from '@/components/auth/LoginHero/LoginHero';
import { CONTAINER_STYLES, FORM_PANEL_STYLES } from './LoginPage.constants';

export function LoginPage() {
  return (
    <div className={CONTAINER_STYLES}>
      <LoginHero />
      <div className={FORM_PANEL_STYLES}>
        <LoginForm />
      </div>
    </div>
  );
}
