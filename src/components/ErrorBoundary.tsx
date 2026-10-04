import { Component, ReactNode } from 'react';

// ============ ERROR BOUNDARY ============
// Captura erros de render (ex.: dados incompletos vindos do banco) e mostra um
// estado claro em vez de deixar a tela completamente em branco.

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: Error | null };

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Erro capturado pelo ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <p className="font-bold text-slate-900 mb-1">Algo deu errado nesta tela</p>
            <p className="text-sm text-slate-500 mb-4 break-words">{String(this.state.error?.message || this.state.error)}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
                Recarregar página
              </button>
              <button onClick={() => { window.location.href = '/'; }} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">
                Voltar para o início
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
