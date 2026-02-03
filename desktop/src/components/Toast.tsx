import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    const id = nextId++;
    const duration = options?.duration ?? 5000;
    setToasts(prev => {
      const updated = [...prev, { id, message, type, duration, action: options?.action }];
      // Max 3 visibles
      return updated.slice(-3);
    });
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(onDismiss, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onDismiss]);

  const icons: Record<ToastType, string> = {
    info: 'i',
    success: '✓',
    error: '✕',
    warning: '!',
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="toast-icon">{icons[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      {toast.action && (
        <button className="toast-action" onClick={() => { toast.action!.onClick(); onDismiss(); }}>
          {toast.action.label}
        </button>
      )}
      <button className="toast-close" onClick={onDismiss}>✕</button>
    </div>
  );
}
