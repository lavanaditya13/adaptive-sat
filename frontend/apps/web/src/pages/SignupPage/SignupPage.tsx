import { SignupForm } from '@/components/auth/SignupForm/SignupForm';
import { LoginHero } from '@/components/auth/LoginHero/LoginHero';
import {
  CONTAINER_STYLES,
  FORM_PANEL_STYLES,
  HEADLINE_LEAD,
  HEADLINE_HIGHLIGHT,
  SUBCOPY,
} from './SignupPage.constants';

export function SignupPage() {
  return (
    <div className={CONTAINER_STYLES}>
      <LoginHero
        headlineLead={HEADLINE_LEAD}
        headlineHighlight={HEADLINE_HIGHLIGHT}
        subcopy={SUBCOPY}
      />
      <div className={FORM_PANEL_STYLES}>
        <SignupForm />
      </div>
    </div>
  );
}
