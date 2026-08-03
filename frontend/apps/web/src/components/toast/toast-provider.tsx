import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

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
  const iconClassName = 'size-4 shrink-0';

  if (variant === 'destructive') {
    return <AlertCircle className={iconClassName} />;
  }

  if (variant === 'success') {
    return <CheckCircle2 className={iconClassName} />;
  }

  return <Info className={iconClassName} />;
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

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6 sm:w-full">
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/90 ${
              toastItem.variant === 'destructive'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : toastItem.variant === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-border bg-background text-foreground'
            }`}
          >
            <div className="flex items-start gap-3">
              <ToastIcon variant={toastItem.variant} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{toastItem.title}</div>
                {toastItem.description ? (
                  <div className="mt-1 text-sm opacity-90">{toastItem.description}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-md p-1 opacity-70 transition hover:opacity-100"
                onClick={() => dismissToast(toastItem.id)}
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
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
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}