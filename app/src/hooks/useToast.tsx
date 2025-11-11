import { useCallback, useState } from 'react';
import type { ToastMessage } from '../components/ui/Toast';

type ToastInput = Omit<ToastMessage, 'id'>;

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((input: ToastInput) => {
    const id = Math.random().toString(36).slice(2);
    setToast({ id, ...input });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToast((current) => (current && current.id === id ? null : current));
  }, []);

  return {
    toast,
    showToast,
    dismissToast,
  } as const;
}

