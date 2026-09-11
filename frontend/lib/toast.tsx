"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; bar: string; icon: ReactNode }
> = {
  success: {
    border: "border-[#6FA287]/25",
    bar: "bg-[#6FA287]",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path
          d="M4 10.5L8 14.5L16 6"
          stroke="#6FA287"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  error: {
    border: "border-[#E2725B]/25",
    bar: "bg-[#E2725B]",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M10 6v5" stroke="#E2725B" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="10" cy="14" r="1" fill="#E2725B" />
      </svg>
    ),
  },
  info: {
    border: "border-[#4FA8D6]/25",
    bar: "bg-[#4FA8D6]",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.2" stroke="#4FA8D6" strokeWidth="1.6" />
        <path d="M10 9v4.2M10 6.8v.01" stroke="#4FA8D6" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, variant, title, description }]);
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    success: (title, description) => push("success", title, description),
    error: (title, description) => push("error", title, description),
    info: (title, description) => push("info", title, description),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const styles = VARIANT_STYLES[toast.variant];

  return (
    <div
      className={cnToast(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border bg-[#12161D]/90 px-4 py-3.5 shadow-2xl shadow-black/40 backdrop-blur-xl",
        styles.border,
      )}
    >
      <div className={cnToast("absolute inset-y-0 left-0 w-[3px]", styles.bar)} />
      <div className="flex items-start gap-3 pl-1.5">
        <div className="mt-0.5 shrink-0">{styles.icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#E8E6E1]">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-[13px] leading-snug text-[#8B93A1]">
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-[#8B93A1] transition-colors hover:text-[#E8E6E1]"
          aria-label="Dismiss notification"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function cnToast(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
