import type { User } from '@/types/api';

export const FALLBACK_USER_NAME = 'Student';
export const FALLBACK_INITIALS = 'ST';

export function getDisplayName(user: User | null): string {
  return user?.full_name?.trim() || FALLBACK_USER_NAME;
}

export function getFirstName(user: User | null): string {
  return getDisplayName(user).split(' ')[0];
}

/** First letter of the first two name parts, e.g. "Alex Chen" -> "AC". */
export function getInitials(user: User | null): string {
  const parts = getDisplayName(user).split(' ').filter(Boolean);
  const initials = parts
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || FALLBACK_INITIALS;
}
