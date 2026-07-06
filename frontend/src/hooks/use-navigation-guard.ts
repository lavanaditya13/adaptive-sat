'use client';

import { useEffect } from 'react';

/**
 * Shows a browser confirmation dialog when the user tries to navigate away
 * (close tab, refresh, or use browser back/forward) while `shouldGuard` is true.
 *
 * Note: In Next.js App Router, client-side route changes via <Link> or router.push
 * don't trigger `beforeunload`. This guard covers tab close / refresh / browser nav.
 * For in-app navigation, route-level guards would need Next.js middleware or
 * intercepting the router, which is not yet fully supported in App Router.
 */
export function useNavigationGuard(
    shouldGuard: boolean,
    message: string = 'Leave practice? Your progress on this question won\'t be saved.'
) {
    useEffect(() => {
        if (!shouldGuard) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Modern browsers show a generic message, but we set returnValue for compat
            e.returnValue = message;
            return message;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [shouldGuard, message]);
}
