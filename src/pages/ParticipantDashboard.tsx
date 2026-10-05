import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Race, Registration, Payment } from '../types';
import { supabase, isDemoMode, supabaseUrlSafe, supabaseAnonKeySafe } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getRegistrationStatus, getRegistrationStatusText, getRegistrationStatusColor, canRegister, formatEventDate, getEnrollmentStatusLabel } from '../utils/raceStatus';
import { showToast } from '../utils/toast';
import { confirmAction } from '../utils/confirm';
import { setEventShareMeta, resetShareMeta } from '../utils/shareMeta';
import { toSafeNumber, getLowestPrice, discounted, formatBRL } from '../utils/pricing';
import { maskPhone } from '../utils/documents';
import { safeRedirectTarget } from '../components/ProtectedRoute';
import { Calendar, FileText, LayoutDashboard, LogOut, Trophy, User, Ticket } from 'lucide-react';
import { getKitLabel, getParticipantName } from './registrationHelpers';

// Opção de menu do usuário (usado no dropdown e na versão mobile do Header)
export function MenuLink({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

export default function ParticipantDashboard() {
  const { user, logout, updateProfile } = useAuth();
  const { getRegistrationByUser, getPaymentByRegistration, getRaceById } = useData();
  const navigate = useNavigate();
  // Menu de topo usa ?tab=perfil para focar o card "Meu Perfil" (scroll) e
  // ?tab=inscricoes para o card "Minhas Inscrições".
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'perfil' ? 'perfil' : 'inscricoes';
  const perfilRef = useRef<HTMLDivElement>(null);
  const inscricoesRef = useRef<HTMLDivElement>(null);
  // Edição dos dados cadastrais (nome / telefone) direto na tela "Meu Perfil".
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (activeTab === 'perfil') perfilRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else inscricoesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeTab]);

  if (!user) return null;

  const myRegistrations = getRegistrationByUser(user.id);
  const handleLogout = () => { logout(); navigate('/'); };

  const startEditProfile = () => {
    setProfileForm({ name: user.name || '', phone: user.phone ? maskPhone(user.phone) : '' });
    setEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = profileForm.name.trim();
    const phone = profileForm.phone.trim();
    if (name.length < 3) {
      showToast('Informe seu nome completo.', 'error');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      showToast('Informe um telefone válido com DDD (ex.: (11) 99999-9999).', 'error');
      return;
    }
    setSavingProfile(true);
    const result = await updateProfile({ name, phone });
    setSavingProfile(false);
    if (result.success) {
      showToast(result.message, 'success');
      setEditingProfile(false);
    } else {
      showToast(result.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg"><Trophy className="w-6 h-6 text-white" /></div>
            <span className="hidden sm:inline text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Smart Brasil Ticket</span>
          </Link>
          {/* Menu de topo do usuário: Meu Perfil / Minhas Inscrições / Ver Eventos */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <Link to="/minha-conta?tab=perfil" className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap ${activeTab === 'perfil' ? 'text-orange-700 bg-orange-50' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-700'}`}>
              <User className="w-4 h-4" />Meu Perfil
            </Link>
            <Link to="/minha-conta" className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap ${activeTab === 'inscricoes' ? 'text-orange-700 bg-orange-50' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-700'}`}>
              <Ticket className="w-4 h-4" />Minhas Inscrições
            </Link>
            <Link to="/" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-700 whitespace-nowrap">
              <Calendar className="w-4 h-4" />Ver Eventos
            </Link>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            {user.role === 'admin' && (
              <Link to="/admin" className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                <LayoutDashboard className="w-4 h-4" />
                Painel Admin
              </Link>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sair</span></button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Olá, {user.name.split(' ')[0]}! 👋</h1>

        {user.role === 'admin' && (
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">🎛️ Painel Administrativo</h2>
                <p className="text-purple-100 text-sm">Acesse o painel para gerenciar eventos, inscrições e pagamentos</p>
              </div>
              <Link to="/admin" className="flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition-colors">
                <LayoutDashboard className="w-5 h-5" />
                Acessar Painel
              </Link>
            </div>
          </div>
        )}

        <div ref={inscricoesRef} className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 scroll-mt-20">
          <div className="p-6 border-b"><h2 className="text-lg font-bold">Minhas Inscrições</h2></div>
          {myRegistrations.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Você ainda não tem inscrições</p>
              <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg">Encontrar Eventos</Link>
            </div>
          ) : (
            <div className="divide-y">
              {myRegistrations.map(reg => {
                const race = getRaceById(reg.raceId);
                const payment = getPaymentByRegistration(reg.id);
                if (!race) return null;
                return (
                  <div key={reg.id} className="p-6 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <img src={race.image} alt={race.name} className="w-full md:w-24 h-24 rounded-xl object-cover" />
                      <div className="flex-1">
                        <h3 className="font-bold">{race.name}</h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                          {/* Auditoria UX G1: data segura — evita crash de parseISO('') em telas criticas */}
                          <span>{formatEventDate(race.date, race.time)}</span>
                          <span>📍 {race.city}</span>
                          <span>🏃 {reg.distance}km</span>
                        </div>
                        <p className="text-xs font-mono text-gray-400 mt-1">Código: {reg.confirmationCode}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {/* Auditoria UX G1/G6: cada estado tem rotulo, cor e explicacao proprios.
                            "Em processamento" virou texto explicito do que esta acontecendo. */}
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          reg.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          reg.status === 'pending_payment' ? 'bg-orange-100 text-orange-700' :
                          reg.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getEnrollmentStatusLabel(reg).text}
                        </span>
                        {getEnrollmentStatusLabel(reg).hint && (
                          <p className="text-[11px] text-gray-400 max-w-[200px] text-right">{getEnrollmentStatusLabel(reg).hint}</p>
                        )}
                        {reg.status === 'pending_payment' && (
                          <Link to={`/pagamento/${reg.id}`} className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-medium rounded-lg">Pagar Agora</Link>
                        )}
                        {reg.status === 'confirmed' && payment && (
                          <Link to={`/comprovante/${reg.id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"><FileText className="w-3 h-3" />Comprovante</Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div ref={perfilRef} className="bg-white rounded-xl shadow-sm p-6 scroll-mt-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Meu Perfil</h2>
            {!editingProfile && (
              <button
                onClick={startEditProfile}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
              >
                ✏️ Editar dados
              </button>
            )}
          </div>

          {editingProfile ? (
            // Edição dos dados cadastrais: nome e telefone editáveis; e-mail não pode ser alterado.
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo <span className="text-rose-600">*</span></label>
                <input
                  type="text"
                  autoComplete="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone <span className="text-rose-600">*</span></label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: maskPhone(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail <span className="text-slate-400 font-normal">(não editável)</span></label>
                <input type="email" value={user.email} disabled className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" />
                <p className="text-xs text-slate-400 mt-1">O e-mail de acesso não pode ser alterado por aqui.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={savingProfile} className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg disabled:opacity-50">
                  {savingProfile ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={() => setEditingProfile(false)} disabled={savingProfile} className="px-5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Nome</p><p className="font-medium">{user.name}</p></div>
              <div><p className="text-xs text-gray-500">E-mail</p><p className="font-medium">{user.email}</p></div>
              <div><p className="text-xs text-gray-500">Telefone</p><p className="font-medium">{user.phone || 'Não informado'}</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ APP ============
