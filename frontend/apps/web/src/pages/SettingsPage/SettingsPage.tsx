import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Link2, User as UserIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { ConnectedProvidersList } from '@/components/settings/ConnectedProvidersList/ConnectedProvidersList';
import { getConnectedProviders } from '@/services/settings-service';
import { useAuthStore } from '@/store/auth-store';
import { useAppShellStore } from '@/store/app-shell-store';
import { queryKeys } from '@/constants/query-keys';
import { ROUTES } from '@/constants/routes';
import {
  PAGE_CONTAINER_STYLES,
  HEADER_STYLES,
  HEADER_TITLE_STYLES,
  HEADER_SUBTITLE_STYLES,
  CARD_STYLES,
  CARD_BODY_STYLES,
  CARD_BODY_FLUSH_STYLES,
  SECTION_HEADER_ROW_STYLES,
  ICON_TILE_PROFILE_STYLES,
  ICON_TILE_LINKED_STYLES,
  ICON_TILE_NOTIF_STYLES,
  SECTION_TITLE_STYLES,
  SECTION_SUBTITLE_STYLES,
  IDENTITY_ROW_STYLES,
  IDENTITY_AVATAR_STYLES,
  IDENTITY_NAME_STYLES,
  IDENTITY_EMAIL_STYLES,
  FIELD_STACK_STYLES,
  FIELD_GRID_STYLES,
  FIELD_LABEL_STYLES,
  FIELD_INPUT_STYLES,
  READONLY_FIELD_STYLES,
  READONLY_HELPER_STYLES,
  FOOTER_DIVIDER_STYLES,
  FOOTER_ROW_STYLES,
  UNSAVED_LABEL_STYLES,
  SAVE_BUTTON_ENABLED_STYLES,
  SAVE_BUTTON_DISABLED_STYLES,
  SKELETON_ROW_STYLES,
  ADD_PROVIDER_BUTTON_STYLES,
  NOTIF_COMING_SOON_STYLES,
  NOTIF_LIST_STYLES,
  NOTIF_ROW_STYLES,
  NOTIF_LABEL_STYLES,
  NOTIF_DESC_STYLES,
  TOGGLE_TRACK_ON_STYLES,
  TOGGLE_TRACK_OFF_STYLES,
  TOGGLE_KNOB_ON_STYLES,
  TOGGLE_KNOB_OFF_STYLES,
} from './SettingsPage.styles';
import {
  HEADER_TITLE,
  HEADER_SUBTITLE,
  PROFILE_CARD_TITLE,
  PROFILE_CARD_SUBTITLE,
  FIRST_NAME_LABEL,
  LAST_NAME_LABEL,
  EMAIL_LABEL,
  EMAIL_HELPER,
  UNSAVED_CHANGES_LABEL,
  SAVE_CHANGES_LABEL,
  PROFILE_UPDATED_TOAST,
  LINKED_ACCOUNTS_TITLE,
  LINKED_ACCOUNTS_SUBTITLE,
  ADD_PROVIDER_LABEL,
  LOAD_ERROR_MESSAGE,
  NOTIFICATIONS_TITLE,
  NOTIFICATIONS_SUBTITLE,
  NOTIFICATIONS_COMING_SOON,
  EMAIL_NOTIF_LABEL,
  EMAIL_NOTIF_DESC,
  STUDY_REMINDERS_LABEL,
  STUDY_REMINDERS_DESC,
} from './SettingsPage.constants';

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const showToast = useAppShellStore((state) => state.showToast);
  const queryClient = useQueryClient();

  const [hydratedUserId, setHydratedUserId] = useState<number | null>(null);
  const [savedFirstName, setSavedFirstName] = useState('');
  const [savedLastName, setSavedLastName] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');

  // Hydrate the editable fields once the authenticated user is available. Only
  // runs once per user (adjusting state during render, per the React-recommended
  // pattern) so an in-progress edit is never clobbered by a later refetch.
  if (user && hydratedUserId !== user.user_id) {
    const { firstName, lastName } = splitFullName(user.full_name);
    setSavedFirstName(firstName);
    setSavedLastName(lastName);
    setFirstNameInput(firstName);
    setLastNameInput(lastName);
    setHydratedUserId(user.user_id);
  }

  const isProfileDirty = firstNameInput.trim() !== savedFirstName || lastNameInput.trim() !== savedLastName;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings.connectedProviders,
    queryFn: getConnectedProviders,
  });

  const handleUnlinked = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.connectedProviders });
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
  };

  const handleSaveProfile = () => {
    if (!user) return;
    const nextFirstName = firstNameInput.trim();
    const nextLastName = lastNameInput.trim();
    const nextFullName = [nextFirstName, nextLastName].filter(Boolean).join(' ');

    // No backend endpoint persists profile name changes today (verified: no
    // PATCH/PUT route exists for the user profile, and the User model only
    // stores a single full_name column). This updates the local session only
    // — it does not survive a refresh — so we deliberately do NOT invalidate
    // the auth "me" query here, since that would immediately refetch the
    // unchanged server value and silently revert this "successful" save.
    setUser({ ...user, full_name: nextFullName });
    setSavedFirstName(nextFirstName);
    setSavedLastName(nextLastName);
    setFirstNameInput(nextFirstName);
    setLastNameInput(nextLastName);
    showToast(PROFILE_UPDATED_TOAST);
  };

  return (
    <div className={PAGE_CONTAINER_STYLES}>
      <div className={HEADER_STYLES}>
        <h1 className={HEADER_TITLE_STYLES}>{HEADER_TITLE}</h1>
        <p className={HEADER_SUBTITLE_STYLES}>{HEADER_SUBTITLE}</p>
      </div>

      <section className={CARD_STYLES}>
        <div className={CARD_BODY_STYLES}>
          <div className={SECTION_HEADER_ROW_STYLES}>
            <span className={ICON_TILE_PROFILE_STYLES}>
              <UserIcon />
            </span>
            <div>
              <p className={SECTION_TITLE_STYLES}>{PROFILE_CARD_TITLE}</p>
              <p className={SECTION_SUBTITLE_STYLES}>{PROFILE_CARD_SUBTITLE}</p>
            </div>
          </div>

          <div className={IDENTITY_ROW_STYLES}>
            <span className={IDENTITY_AVATAR_STYLES}>{getInitials(user?.full_name ?? '')}</span>
            <div className="min-w-0">
              <p className={IDENTITY_NAME_STYLES}>{user?.full_name}</p>
              <p className={IDENTITY_EMAIL_STYLES}>{user?.email}</p>
            </div>
          </div>

          <div className={FIELD_STACK_STYLES}>
            <div className={FIELD_GRID_STYLES}>
              <div>
                <label className={FIELD_LABEL_STYLES} htmlFor="settings-first-name">
                  {FIRST_NAME_LABEL}
                </label>
                <Input
                  id="settings-first-name"
                  className={FIELD_INPUT_STYLES}
                  value={firstNameInput}
                  onChange={(event) => setFirstNameInput(event.target.value)}
                />
              </div>
              <div>
                <label className={FIELD_LABEL_STYLES} htmlFor="settings-last-name">
                  {LAST_NAME_LABEL}
                </label>
                <Input
                  id="settings-last-name"
                  className={FIELD_INPUT_STYLES}
                  value={lastNameInput}
                  onChange={(event) => setLastNameInput(event.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={FIELD_LABEL_STYLES}>{EMAIL_LABEL}</label>
              <div className={READONLY_FIELD_STYLES}>{user?.email}</div>
              <p className={READONLY_HELPER_STYLES}>{EMAIL_HELPER}</p>
            </div>
          </div>
        </div>

        <div className={FOOTER_DIVIDER_STYLES} />
        <div className={FOOTER_ROW_STYLES}>
          {isProfileDirty ? (
            <>
              <span className={UNSAVED_LABEL_STYLES}>{UNSAVED_CHANGES_LABEL}</span>
              <button type="button" className={SAVE_BUTTON_ENABLED_STYLES} onClick={handleSaveProfile}>
                {SAVE_CHANGES_LABEL}
              </button>
            </>
          ) : (
            <button type="button" className={SAVE_BUTTON_DISABLED_STYLES} disabled>
              {SAVE_CHANGES_LABEL}
            </button>
          )}
        </div>
      </section>

      <section className={CARD_STYLES}>
        <div className={CARD_BODY_FLUSH_STYLES}>
          <div className={SECTION_HEADER_ROW_STYLES}>
            <span className={ICON_TILE_LINKED_STYLES}>
              <Link2 />
            </span>
            <div>
              <p className={SECTION_TITLE_STYLES}>{LINKED_ACCOUNTS_TITLE}</p>
              <p className={SECTION_SUBTITLE_STYLES}>{LINKED_ACCOUNTS_SUBTITLE}</p>
            </div>
          </div>

          {isLoading && <Skeleton className={SKELETON_ROW_STYLES} />}
          {error && <p className="text-sm text-danger">{LOAD_ERROR_MESSAGE}</p>}
          {data && (
            <>
              <ConnectedProvidersList providers={data.providers} hasPassword={data.has_password} onUnlinked={handleUnlinked} />
              <Button
                type="button"
                variant="outline"
                className={ADD_PROVIDER_BUTTON_STYLES}
                onClick={() => navigate(ROUTES.LINK_ACCOUNTS)}
              >
                {ADD_PROVIDER_LABEL}
              </Button>
            </>
          )}
        </div>
      </section>

      <section className={CARD_STYLES}>
        <div className={CARD_BODY_FLUSH_STYLES}>
          <div className={SECTION_HEADER_ROW_STYLES}>
            <span className={ICON_TILE_NOTIF_STYLES}>
              <Bell />
            </span>
            <div>
              <p className={SECTION_TITLE_STYLES}>{NOTIFICATIONS_TITLE}</p>
              <p className={SECTION_SUBTITLE_STYLES}>{NOTIFICATIONS_SUBTITLE}</p>
            </div>
          </div>

          {/* No backend endpoint persists notification preferences yet, so these
              toggles are rendered visibly disabled rather than faking a save. */}
          <p className={NOTIF_COMING_SOON_STYLES}>{NOTIFICATIONS_COMING_SOON}</p>

          <div className={NOTIF_LIST_STYLES}>
            <div className={NOTIF_ROW_STYLES}>
              <div>
                <p className={NOTIF_LABEL_STYLES}>{EMAIL_NOTIF_LABEL}</p>
                <p className={NOTIF_DESC_STYLES}>{EMAIL_NOTIF_DESC}</p>
              </div>
              <span className={TOGGLE_TRACK_ON_STYLES} role="switch" aria-checked="true" aria-disabled="true">
                <span className={TOGGLE_KNOB_ON_STYLES} />
              </span>
            </div>
            <div className={NOTIF_ROW_STYLES}>
              <div>
                <p className={NOTIF_LABEL_STYLES}>{STUDY_REMINDERS_LABEL}</p>
                <p className={NOTIF_DESC_STYLES}>{STUDY_REMINDERS_DESC}</p>
              </div>
              <span className={TOGGLE_TRACK_OFF_STYLES} role="switch" aria-checked="false" aria-disabled="true">
                <span className={TOGGLE_KNOB_OFF_STYLES} />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
