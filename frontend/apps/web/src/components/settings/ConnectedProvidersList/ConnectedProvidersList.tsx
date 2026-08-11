import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogFooter } from '@workspace/ui/components/dialog';
import { GoogleIcon } from '@/components/auth/OAuthButtons/OAuthButtons';
import { unlinkProvider } from '@/services/settings-service';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import type { ConnectedProvider } from '@/types/api';
import {
  LIST_STYLES,
  ROW_STYLES,
  PROVIDER_ICON_TILE_STYLES,
  PROVIDER_INFO_STYLES,
  PROVIDER_NAME_ROW_STYLES,
  PROVIDER_NAME_STYLES,
  CONNECTED_BADGE_STYLES,
  PROVIDER_EMAIL_STYLES,
  emptyStateStyles,
  ACTION_WRAP_STYLES,
  TIP_STYLES,
  DISCONNECT_BUTTON_ENABLED_STYLES,
  DISCONNECT_BUTTON_DISABLED_STYLES,
  DIALOG_CONTENT_STYLES,
  DIALOG_TITLE_STYLES,
  DIALOG_DESCRIPTION_STYLES,
  DIALOG_FOOTER_STYLES,
  DIALOG_CANCEL_STYLES,
  DIALOG_CONFIRM_STYLES,
} from './ConnectedProvidersList.styles';
import {
  GOOGLE_DISPLAY_NAME,
  CONNECTED_BADGE_LABEL,
  DISCONNECT_LABEL,
  DISCONNECTING_LABEL,
  LAST_METHOD_TOOLTIP,
  EMPTY_STATE,
  DISCONNECT_SUCCESS_TITLE,
  DISCONNECT_ERROR_TITLE,
  DISCONNECT_DIALOG_TITLE,
  DISCONNECT_DIALOG_DESCRIPTION,
  CANCEL_LABEL,
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
  const [tipProvider, setTipProvider] = useState<'google' | null>(null);
  const [confirmProvider, setConfirmProvider] = useState<'google' | null>(null);

  const isOnlyAuthMethod = !hasPassword && providers.length === 1;

  const handleConfirmDisconnect = async () => {
    const provider = confirmProvider;
    if (!provider) return;
    setConfirmProvider(null);
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
    <>
      <div className={LIST_STYLES}>
        {providers.map((connection) => {
          const isDisabled = isOnlyAuthMethod || pendingProvider === connection.provider;
          const showTip = isOnlyAuthMethod && tipProvider === connection.provider;

          return (
            <div key={connection.provider} className={ROW_STYLES}>
              <span className={PROVIDER_ICON_TILE_STYLES}>
                <GoogleIcon />
              </span>
              <div className={PROVIDER_INFO_STYLES}>
                <div className={PROVIDER_NAME_ROW_STYLES}>
                  <p className={PROVIDER_NAME_STYLES}>{PROVIDER_DISPLAY_NAME[connection.provider]}</p>
                  <span className={CONNECTED_BADGE_STYLES}>{CONNECTED_BADGE_LABEL}</span>
                </div>
                {connection.email && <p className={PROVIDER_EMAIL_STYLES}>{connection.email}</p>}
              </div>

              <div
                className={ACTION_WRAP_STYLES}
                onMouseEnter={() => setTipProvider(connection.provider)}
                onMouseLeave={() => setTipProvider(null)}
                onFocus={() => setTipProvider(connection.provider)}
                onBlur={() => setTipProvider(null)}
              >
                {showTip && <div className={TIP_STYLES}>{LAST_METHOD_TOOLTIP}</div>}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={isDisabled ? DISCONNECT_BUTTON_DISABLED_STYLES : DISCONNECT_BUTTON_ENABLED_STYLES}
                  disabled={isDisabled}
                  onClick={() => setConfirmProvider(connection.provider)}
                >
                  {pendingProvider === connection.provider ? DISCONNECTING_LABEL : DISCONNECT_LABEL}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={confirmProvider !== null} onOpenChange={(open) => !open && setConfirmProvider(null)}>
        <DialogContent className={DIALOG_CONTENT_STYLES}>
          <p className={DIALOG_TITLE_STYLES}>{DISCONNECT_DIALOG_TITLE}</p>
          <p className={DIALOG_DESCRIPTION_STYLES}>{DISCONNECT_DIALOG_DESCRIPTION}</p>
          <DialogFooter className={DIALOG_FOOTER_STYLES}>
            <Button type="button" variant="outline" className={DIALOG_CANCEL_STYLES} onClick={() => setConfirmProvider(null)}>
              {CANCEL_LABEL}
            </Button>
            <Button type="button" className={DIALOG_CONFIRM_STYLES} onClick={handleConfirmDisconnect}>
              {DISCONNECT_LABEL}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
