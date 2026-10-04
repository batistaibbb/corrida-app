// Auditoria UX A5: toasts no lugar de alert() (nativos, bloqueantes e feios).
// API mínima e sem dependências: toast.success / toast.error / toast.info.
// O <ToastHost /> é montado uma vez dentro do Router; os chamadores usam
// showToast(), que funciona em qualquer módulo sem hooks.

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let nextId = 1;
const listeners = new Set<(t: ToastItem) => void>();

/** Dispara um toast a partir de qualquer código (não precisa de hook). */
export function showToast(message: string, type: ToastType = 'info', durationMs = 4000): void {
  const item = { id: nextId++, message, type };
  listeners.forEach((cb) => cb(item));
  if (durationMs > 0) {
    // Auto-dismiss gerenciado pelo próprio host via timeout registrado aqui.
    setTimeout(() => dismissToast(item.id), durationMs);
  }
}

export function dismissToast(id: number): void {
  dismissListeners.forEach((cb) => cb(id));
}

const dismissListeners = new Set<(id: number) => void>();

const STYLES: Record<ToastType, { icon: typeof CheckCircle; cls: string }> = {
  success: { icon: CheckCircle, cls: 'bg-emerald-600 text-white' },
  error: { icon: AlertCircle, cls: 'bg-red-600 text-white' },
  info: { icon: Info, cls: 'bg-sky-600 text-white' },
};

/** Host fixo no canto inferior direito. Montar uma única vez no App. */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const add = (t: ToastItem) => setToasts((prev) => [...prev.slice(-4), t]);
    const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));
    listeners.add(add);
    dismissListeners.add(remove);
    return () => {
      listeners.delete(add);
      dismissListeners.delete(remove);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0" role="status" aria-live="polite">
      {toasts.map((t) => {
        const { icon: Icon, cls } = STYLES[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[fadeIn_.2s_ease-out] ${cls}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="flex-1 whitespace-pre-line">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Fechar notificação"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
