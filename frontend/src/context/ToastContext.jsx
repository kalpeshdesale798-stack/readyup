import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'success', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => {
          let bg = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700';
          let icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;

          if (toast.type === 'error') {
            bg = 'bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100 border-rose-200 dark:border-rose-800';
            icon = <XCircle className="w-5 h-5 text-rose-600" />;
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800';
            icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
          } else if (toast.type === 'info') {
            bg = 'bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-teal-100 border-teal-200 dark:border-teal-800';
            icon = <Info className="w-5 h-5 text-teal-600" />;
          } else {
            bg = 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5 ${bg}`}
            >
              <div className="shrink-0 mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && <h5 className="font-semibold text-sm leading-tight">{toast.title}</h5>}
                {toast.message && <p className="text-xs opacity-90 mt-0.5 leading-normal">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded-lg"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
