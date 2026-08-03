import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { ConnectedProvidersList } from '@/components/settings/ConnectedProvidersList/ConnectedProvidersList';
import { getConnectedProviders } from '@/services/settings-service';
import { useAuthStore } from '@/store/auth-store';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import {
  CONTAINER_STYLES,
  PAGE_TITLE_STYLES,
  SECTION_STYLES,
  SECTION_TITLE_STYLES,
  ACCOUNT_ROW_STYLES,
  ACCOUNT_NAME_STYLES,
  ACCOUNT_EMAIL_STYLES,
  SKELETON_ROW_STYLES,
} from './SettingsPage.styles';
import {
  TITLE,
  ACCOUNT_SECTION_TITLE,
  PROVIDERS_SECTION_TITLE,
  ADD_PROVIDER_LABEL,
  VERIFIED_BADGE_LABEL,
  UNVERIFIED_BADGE_LABEL,
  LOAD_ERROR_MESSAGE,
} from './SettingsPage.constants';

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings.connectedProviders,
    queryFn: getConnectedProviders,
  });

  const handleUnlinked = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.connectedProviders });
  };

  return (
    <div className={CONTAINER_STYLES}>
      <h1 className={PAGE_TITLE_STYLES}>{TITLE}</h1>

      <div className={SECTION_STYLES}>
        <h2 className={SECTION_TITLE_STYLES}>{ACCOUNT_SECTION_TITLE}</h2>
        <div className={ACCOUNT_ROW_STYLES}>
          <div>
            <p className={ACCOUNT_NAME_STYLES}>{user?.full_name}</p>
            <p className={ACCOUNT_EMAIL_STYLES}>{user?.email}</p>
          </div>
          <Badge variant={user?.email_verified ? 'default' : 'secondary'}>
            {user?.email_verified ? VERIFIED_BADGE_LABEL : UNVERIFIED_BADGE_LABEL}
          </Badge>
        </div>
      </div>

      <div className={SECTION_STYLES}>
        <h2 className={SECTION_TITLE_STYLES}>{PROVIDERS_SECTION_TITLE}</h2>

        {isLoading && <Skeleton className={SKELETON_ROW_STYLES} />}

        {error && <p className="text-sm text-destructive">{LOAD_ERROR_MESSAGE}</p>}

        {data && (
          <ConnectedProvidersList
            providers={data.providers}
            hasPassword={data.has_password}
            onUnlinked={handleUnlinked}
          />
        )}

        <Button type="button" variant="outline" onClick={() => navigate(ROUTES.LINK_ACCOUNTS)}>
          {ADD_PROVIDER_LABEL}
        </Button>
      </div>
    </div>
  );
}
