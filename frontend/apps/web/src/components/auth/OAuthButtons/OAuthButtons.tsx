import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { getOAuthStartUrl } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';
import {
  CONTAINER_STYLES,
  googleButtonStyles,
  dividerRowStyles,
  dividerLineStyles,
  dividerLabelStyles,
} from './OAuthButtons.styles';
import {
  GOOGLE_LABEL,
  DIVIDER_LABEL,
  REDIRECT_ERROR_TITLE,
  REDIRECT_ERROR_DESCRIPTION,
} from './OAuthButtons.constants';

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

export function OAuthButtons({ intent, showDivider = true }: OAuthButtonsProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      const url = await getOAuthStartUrl('google', intent);
      window.location.href = url;
    } catch {
      setIsPending(false);
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
        disabled={isPending}
        className={googleButtonStyles}
        onClick={handleClick}
      >
        <GoogleIcon />
        {GOOGLE_LABEL}
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
