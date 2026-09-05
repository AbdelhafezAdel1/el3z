import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (title: string, message?: string) =>
      showToast({ type: "success", title, message }),
    [showToast],
  );
  const error = useCallback(
    (title: string, message?: string) =>
      showToast({ type: "error", title, message }),
    [showToast],
  );
  const warning = useCallback(
    (title: string, message?: string) =>
      showToast({ type: "warning", title, message }),
    [showToast],
  );
  const info = useCallback(
    (title: string, message?: string) =>
      showToast({ type: "info", title, message }),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, removeToast, success, error, warning, info }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => {
          let bg = "bg-white border-slate-200 text-slate-800";
          let icon = <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;

          if (toast.type === "success") {
            bg =
              "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-100";
            icon = (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            );
          } else if (toast.type === "error") {
            bg = "bg-rose-50 border-rose-300 text-rose-950 shadow-rose-100";
            icon = (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            );
          } else if (toast.type === "warning") {
            bg = "bg-amber-50 border-amber-300 text-amber-950 shadow-amber-100";
            icon = (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            );
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${bg}`}
              role="alert"
            >
              {icon}
              <div className="flex-1">
                <h4 className="font-bold text-sm leading-tight">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs mt-1 text-slate-600 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
