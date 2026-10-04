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
import { safeRedirectTarget } from '../components/ProtectedRoute';
import { Calendar, FileText, LayoutDashboard, LogOut, Trophy } from 'lucide-react';
import { getKitLabel, getParticipantName } from './registrationHelpers';

export default function ParticipantDashboard() {
  const { user, logout } = useAuth();
  const { getRegistrationByUser, getPaymentByRegistration, getRaceById } = useData();
  const navigate = useNavigate();

  if (!user) return null;

  const myRegistrations = getRegistrationByUser(user.id);
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg"><Trophy className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Smart Brasil Ticket</span>
          </Link>
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Link to="/admin" className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                <LayoutDashboard className="w-4 h-4" />
                Painel Admin
              </Link>
            )}
            <Link to="/" className="text-sm text-gray-600 hover:text-orange-600">Ver Eventos</Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" />Sair</button>
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

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
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

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Meu Perfil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500">Nome</p><p className="font-medium">{user.name}</p></div>
            <div><p className="text-xs text-gray-500">E-mail</p><p className="font-medium">{user.email}</p></div>
            <div><p className="text-xs text-gray-500">CPF</p><p className="font-medium">{user.cpf}</p></div>
            <div><p className="text-xs text-gray-500">Telefone</p><p className="font-medium">{user.phone}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ APP ============
