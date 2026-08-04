import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { GoogleIcon } from '@/components/auth/OAuthButtons/OAuthButtons';
import { unlinkProvider } from '@/services/settings-service';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import type { ConnectedProvider } from '@/types/api';
import {
  LIST_STYLES,
  ROW_STYLES,
  PROVIDER_INFO_STYLES,
  ICON_BADGE_STYLES,
  PROVIDER_NAME_STYLES,
  PROVIDER_EMAIL_STYLES,
  emptyStateStyles,
} from './ConnectedProvidersList.styles';
import {
  GOOGLE_DISPLAY_NAME,
  DISCONNECT_LABEL,
  DISCONNECTING_LABEL,
  LAST_METHOD_TOOLTIP,
  EMPTY_STATE,
  DISCONNECT_SUCCESS_TITLE,
  DISCONNECT_ERROR_TITLE,
} from './ConnectedProvidersList.constants';

interface ConnectedProvidersListProps {
  providers: ConnectedProvider[];
  hasPassword: boolean;
  onUnlinked: (provider: 'google') => void;
}

const PROVIDER_DISPLAY_NAME: Record<'google', string> = {
  google: GOOGLE_DISPLAY_NAME,
};

export function ConnectedProvidersList({ providers, hasPassword, onUnlinked }: ConnectedProvidersListProps) {
  const { toast } = useToast();
  const [pendingProvider, setPendingProvider] = useState<'google' | null>(null);

  const isOnlyAuthMethod = !hasPassword && providers.length === 1;

  const handleDisconnect = async (provider: 'google') => {
    setPendingProvider(provider);
    try {
      await unlinkProvider(provider);
      onUnlinked(provider);
      toast({ title: DISCONNECT_SUCCESS_TITLE, variant: 'success' });
    } catch (error) {
      toast({ title: DISCONNECT_ERROR_TITLE, description: getApiErrorDetail(error), variant: 'destructive' });
    } finally {
      setPendingProvider(null);
    }
  };

  if (providers.length === 0) {
    return <p className={emptyStateStyles}>{EMPTY_STATE}</p>;
  }

  return (
    <div className={LIST_STYLES}>
      {providers.map((connection) => {
        const isDisabled = isOnlyAuthMethod || pendingProvider === connection.provider;

        return (
          <div key={connection.provider} className={ROW_STYLES}>
            <div className={PROVIDER_INFO_STYLES}>
              <span className={ICON_BADGE_STYLES}>
                <GoogleIcon />
              </span>
              <div>
                <p className={PROVIDER_NAME_STYLES}>{PROVIDER_DISPLAY_NAME[connection.provider]}</p>
                {connection.email && <p className={PROVIDER_EMAIL_STYLES}>{connection.email}</p>}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDisabled}
              title={isOnlyAuthMethod ? LAST_METHOD_TOOLTIP : undefined}
              onClick={() => handleDisconnect(connection.provider)}
            >
              {pendingProvider === connection.provider ? DISCONNECTING_LABEL : DISCONNECT_LABEL}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
