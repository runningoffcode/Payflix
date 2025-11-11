import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  message: ToastMessage | null;
  onDismiss: (id: string) => void;
  duration?: number;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'from-emerald-500/40 to-cyan-500/40 border-emerald-400/40',
  error: 'from-rose-500/40 to-orange-500/40 border-rose-400/40',
  info: 'from-purple-500/40 to-blue-500/40 border-purple-400/40',
};

export function Toast({ message, onDismiss, duration = 4500 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDismiss(message.id), duration);
    return () => clearTimeout(timer);
  }, [message, onDismiss, duration]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex w-full justify-center px-4">
      <AnimatePresence initial={false}>
        {message && (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="pointer-events-auto w-full max-w-md"
          >
            <div
              className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-lg shadow-black/30`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${VARIANT_STYLES[message.variant ?? 'success']} opacity-80`}
              />
              <div className="relative z-10 flex items-start gap-4 p-5">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/80">
                  {message.variant === 'success' && (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                  {message.variant === 'error' && (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm9-3.75a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {message.variant === 'info' && (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25h1.5v5.25h-1.5v-5.25zM12 9.75a.75.75 0 100-1.5.75.75 0 000 1.5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-semibold text-white">{message.title}</p>
                  {message.description && (
                    <p className="mt-1 text-sm text-white/80">{message.description}</p>
                  )}
                  {message.actionLabel && message.onAction && (
                    <button
                      type="button"
                      onClick={() => {
                        message.onAction?.();
                        onDismiss(message.id);
                      }}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/20 px-4 py-1.5 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/30"
                    >
                      {message.actionLabel}
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(message.id)}
                  className="rounded-full bg-white/10 p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
                  aria-label="Dismiss toast"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Toast;
