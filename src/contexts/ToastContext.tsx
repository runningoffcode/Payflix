import { createContext, useContext, useCallback, type ReactNode } from 'react';
import Toast, { type ToastMessage } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';

type ToastInput = Omit<ToastMessage, 'id'>;

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  dismissToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toast, showToast, dismissToast } = useToast();
  const dismissActiveToast = useCallback(() => {
    if (toast) {
      dismissToast(toast.id);
    }
  }, [toast, dismissToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        dismissToast: dismissActiveToast,
      }}
    >
      {children}
      <Toast message={toast} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
