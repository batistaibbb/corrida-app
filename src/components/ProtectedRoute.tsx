import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Auditoria UX P2: destino seguro pós-login (evita open redirect e /admin acidental).
export function safeRedirectTarget(raw: string | null): string {
  if (!raw) return '/minha-conta';
  try { raw = decodeURIComponent(raw); } catch { /* usa como está */ }
  // Apenas caminhos internos (começam com "/" mas não "//" nem "https://...")
  if (/^\/(?!\/)/.test(raw)) return raw;
  return '/minha-conta';
}

export default function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole?: 'admin' | 'participant' }) {
  const { user } = useAuth();
  if (!user) return <Link to="/login" className="block text-center py-20 text-emerald-600">Faça login para continuar →</Link>;
  // Admins can access any page, participants can only access participant pages
  const userRole = user.role as string;
  if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
    return <div className="text-center py-20">
      <p className="text-xl text-gray-700 mb-4">Acesso negado</p>
      <p className="text-gray-500 mb-4">Você precisa de permissão para acessar esta página.</p>
      {userRole === 'admin' ? (
        <Link to="/admin" className="text-emerald-600 hover:underline">Ir para Dashboard Admin →</Link>
      ) : (
        <Link to="/" className="text-emerald-600 hover:underline">Voltar para a página inicial →</Link>
      )}
    </div>;
  }
  return <>{children}</>;
}
