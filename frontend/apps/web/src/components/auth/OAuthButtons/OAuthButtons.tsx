import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { getOAuthStartUrl } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';
import {
  CONTAINER_STYLES,
  googleButtonStyles,
  appleButtonStyles,
  dividerRowStyles,
  dividerLineStyles,
  dividerLabelStyles,
} from './OAuthButtons.styles';
import {
  GOOGLE_LABEL,
  APPLE_LABEL,
  DIVIDER_LABEL,
  REDIRECT_ERROR_TITLE,
  REDIRECT_ERROR_DESCRIPTION,
} from './OAuthButtons.constants';

type OAuthProvider = 'google' | 'apple';
type OAuthIntent = 'login' | 'signup' | 'link';

interface OAuthButtonsProps {
  intent: OAuthIntent;
  showDivider?: boolean;
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.44H12v4.62h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.1c.95-2.84 3.6-4.95 6.73-4.95Z"
      />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M16.36 1.43c0 1.14-.42 2.2-1.24 3.05-.95 1-2.1 1.6-3.35 1.5-.14-1.1.42-2.26 1.22-3.06.9-.9 2.15-1.5 3.37-1.49ZM20.3 17.5c-.55 1.27-.82 1.84-1.53 2.96-1 1.55-2.4 3.48-4.15 3.5-1.55.02-1.95-1-4.05-1s-2.55.98-4.05 1c-1.75.02-3.08-1.75-4.08-3.3C.3 17.6-.63 14.16.9 11.15c1.06-2.05 2.94-3.35 4.99-3.37 1.6-.03 3.1 1.08 4.05 1.08.95 0 2.78-1.33 4.68-1.13.8.03 3.03.32 4.47 2.44-.12.07-2.67 1.56-2.64 4.65.03 3.7 3.24 4.93 3.28 4.95-.03.08-.5 1.75-.65 2.73Z" />
    </svg>
  );
}

export function OAuthButtons({ intent, showDivider = true }: OAuthButtonsProps) {
  const { toast } = useToast();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  const handleClick = async (provider: OAuthProvider) => {
    setPendingProvider(provider);
    try {
      const url = await getOAuthStartUrl(provider, intent);
      window.location.href = url;
    } catch {
      setPendingProvider(null);
      toast({
        title: REDIRECT_ERROR_TITLE,
        description: REDIRECT_ERROR_DESCRIPTION,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={CONTAINER_STYLES}>
      <Button
        type="button"
        variant="outline"
        disabled={pendingProvider !== null}
        className={googleButtonStyles}
        onClick={() => handleClick('google')}
      >
        <GoogleIcon />
        {GOOGLE_LABEL}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pendingProvider !== null}
        className={appleButtonStyles}
        onClick={() => handleClick('apple')}
      >
        <AppleIcon />
        {APPLE_LABEL}
      </Button>

      {showDivider && (
        <div className={dividerRowStyles}>
          <span className={dividerLineStyles} />
          <span className={dividerLabelStyles}>{DIVIDER_LABEL}</span>
          <span className={dividerLineStyles} />
        </div>
      )}
    </div>
  );
}
