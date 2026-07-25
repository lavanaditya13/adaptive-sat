import { useEffect, useState, useCallback } from 'react';

export function useNavigationGuard(shouldBlock: boolean) {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (shouldBlock) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldBlock]);

  const confirmNavigation = useCallback(
    (onConfirm: () => void) => {
      if (shouldBlock) {
        setPendingNavigation(() => onConfirm);
        setShowExitDialog(true);
      } else {
        onConfirm();
      }
    },
    [shouldBlock]
  );

  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const handleCancelExit = useCallback(() => {
    setShowExitDialog(false);
    setPendingNavigation(null);
  }, []);

  return {
    showExitDialog,
    confirmNavigation,
    handleConfirmExit,
    handleCancelExit,
  };
}
