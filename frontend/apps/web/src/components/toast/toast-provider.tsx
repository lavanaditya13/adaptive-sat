import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import {
  ICON_STYLES,
  VIEWPORT_STYLES,
  TOAST_BASE_STYLES,
  TOAST_DESTRUCTIVE_STYLES,
  TOAST_SUCCESS_STYLES,
  TOAST_DEFAULT_STYLES,
  TOAST_ROW_STYLES,
  TOAST_CONTENT_STYLES,
  TOAST_TITLE_STYLES,
  TOAST_DESCRIPTION_STYLES,
  DISMISS_BUTTON_STYLES,
  DISMISS_ICON_STYLES,
} from './toast-provider.styles';
import { DISMISS_ARIA_LABEL, MISSING_PROVIDER_ERROR } from './toast-provider.constants';

type ToastVariant = 'default' | 'destructive' | 'success';

type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = Omit<ToastMessage, 'id'>;

type ToastContextValue = {
  toast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'destructive') {
    return <AlertCircle className={ICON_STYLES} />;
  }

  if (variant === 'success') {
    return <CheckCircle2 className={ICON_STYLES} />;
  }

  return <Info className={ICON_STYLES} />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextIdRef = useRef(1);
  const timeoutRefs = useRef(new Map<number, ReturnType<typeof window.setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }

    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (nextToast: ToastInput) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;

      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, AUTO_DISMISS_MS);

      timeoutRefs.current.set(id, timeoutId);

      setToasts((currentToasts) => [
        ...currentToasts,
        {
          id,
          ...nextToast,
        },
      ]);
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className={VIEWPORT_STYLES}>
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            className={`${TOAST_BASE_STYLES} ${
              toastItem.variant === 'destructive'
                ? TOAST_DESTRUCTIVE_STYLES
                : toastItem.variant === 'success'
                  ? TOAST_SUCCESS_STYLES
                  : TOAST_DEFAULT_STYLES
            }`}
          >
            <div className={TOAST_ROW_STYLES}>
              <ToastIcon variant={toastItem.variant} />
              <div className={TOAST_CONTENT_STYLES}>
                <div className={TOAST_TITLE_STYLES}>{toastItem.title}</div>
                {toastItem.description ? (
                  <div className={TOAST_DESCRIPTION_STYLES}>{toastItem.description}</div>
                ) : null}
              </div>
              <button
                type="button"
                className={DISMISS_BUTTON_STYLES}
                onClick={() => dismissToast(toastItem.id)}
                aria-label={DISMISS_ARIA_LABEL}
              >
                <X className={DISMISS_ICON_STYLES} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to ToastProvider, kept in the same file
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(MISSING_PROVIDER_ERROR);
  }

  return context;
}