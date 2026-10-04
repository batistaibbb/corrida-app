// Auditoria UX A5: substitui window.confirm() nativo (bloqueante, sem estilo e
// ignorado por alguns browsers em iframes) por um modal acessível com Promise.
// API mínima: await confirmAction({ title, message, confirmLabel, danger }) -> boolean
// O <ConfirmHost /> é montado uma vez dentro do Router (junto com ToastHost).

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  /** Texto do corpo; aceita \n para quebras de linha. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botão vermelho (para ações destrutivas como excluir evento). */
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

let nextId = 1;
const listeners = new Set<(r: ConfirmRequest) => void>();

/** Abre o modal de confirmação e resolve true se o usuário confirmar. */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req: ConfirmRequest = { ...opts, id: nextId++, resolve };
    let delivered = false;
    listeners.forEach((cb) => {
      delivered = true;
      cb(req);
    });
    // Sem host montado (ex.: testes): não bloquear — tratar como "não confirmado".
    if (!delivered) resolve(false);
  });
}

/** Host do modal. Montar uma única vez no App. */
export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    const add = (r: ConfirmRequest) => setReq(r);
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  // Esc fecha como "cancelar"; Enter confirma.
  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false);
      if (e.key === 'Enter') settle(true);
    };
    const settle = (ok: boolean) => {
      req.resolve(ok);
      setReq(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req]);

  if (!req) return null;

  const settle = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={() => settle(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`shrink-0 rounded-full p-2 ${req.danger ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-title" className="font-bold text-slate-900">{req.title}</h3>
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{req.message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            autoFocus
            onClick={() => settle(false)}
            className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            {req.cancelLabel || 'Cancelar'}
          </button>
          <button
            onClick={() => settle(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
              req.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {req.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
