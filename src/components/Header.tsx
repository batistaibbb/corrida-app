import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, LayoutDashboard, User, LogOut, Ticket, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isDemoMode } from '../lib/supabase';

// Opções do menu de topo do usuário participante (dropdown no desktop).
const PARTICIPANT_MENU = [
  { to: '/minha-conta?tab=perfil', label: 'Meu Perfil', icon: User },
  { to: '/minha-conta', label: 'Minhas Inscrições', icon: Ticket },
  { to: '/', label: 'Ver Eventos', icon: Calendar },
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900 tracking-tight">
              Smart Brasil Ticket
            </span>
            {isDemoMode && (
              <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded uppercase tracking-wide" title="Dados fictícios em localStorage — não é produção">
                Demo
              </span>
            )}
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Menu de topo do usuário: links diretos em telas grandes */}
                <nav className="hidden lg:flex items-center gap-1">
                  {PARTICIPANT_MENU.map(item => (
                    <Link key={item.label} to={item.to} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors whitespace-nowrap">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
                {user.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                {/* Dropdown com as mesmas opções em telas menores */}
                <div className="relative lg:hidden">
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-emerald-400 transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">{user.name.charAt(0)}</span>
                    </div>
                    <span className="hidden sm:inline max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {menuOpen && (
                    <>
                      {/* clique fora fecha o menu */}
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50" role="menu">
                        {PARTICIPANT_MENU.map(item => (
                          <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-emerald-600 transition-colors" title="Sair">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-emerald-400 transition-colors">
                  <User className="w-4 h-4" />
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
