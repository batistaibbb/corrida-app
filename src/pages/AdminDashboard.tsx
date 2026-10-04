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
import { LayoutDashboard, CreditCard, AlertCircle, Calendar, CheckCircle, DollarSign, Download, Edit, Eye, EyeOff, FileText, Lock, LogOut, Plus, Search, Trash2, Trophy, Unlock, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import EventForm from '../components/EventForm';
import RegistrationDetailsModal from './registrationHelpers';
import { exportToPDF, exportToExcel, getParticipantName, getParticipantPhone, getParticipantEmail, getParticipantCpf, getKitLabel } from './registrationHelpers';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { races, registrations, payments, getStats, addRace, updateRace, deleteRace, approvePayment } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'registrations' | 'payments'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  // Filtros da aba de Inscrições (relatório)
  const [regFilterRace, setRegFilterRace] = useState<string>('all');
  const [regFilterStatus, setRegFilterStatus] = useState<string>('all');
  const [regSearch, setRegSearch] = useState<string>('');
  const stats = getStats();

  const handleLogout = () => { logout(); navigate('/'); };

  // Lista filtrada de inscrições para tabela e exportações do relatório
  const filteredRegistrations = registrations.filter(reg => {
    if (regFilterRace !== 'all' && reg.raceId !== regFilterRace) return false;
    if (regFilterStatus === 'confirmed' && reg.status !== 'confirmed') return false;
    if (regFilterStatus === 'pending' && reg.status === 'confirmed') return false;
    if (regSearch.trim()) {
      const q = regSearch.trim().toLowerCase();
      const raceName = (races.find(r => r.id === reg.raceId)?.name || '').toLowerCase();
      const haystack = [
        getParticipantName(reg), getParticipantPhone(reg), getParticipantEmail(reg),
        getParticipantCpf(reg), reg.confirmationCode, reg.kitName || '', raceName,
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg"><Trophy className="w-5 h-5 text-white" /></div>
            <span className="font-bold">Smart Brasil Ticket</span>
          </Link>
          <p className="text-xs text-gray-500 mt-2">Painel Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'events', label: 'Eventos', icon: Calendar }, { id: 'registrations', label: 'Inscrições', icon: Users }, { id: 'payments', label: 'Pagamentos', icon: CreditCard }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${activeTab === tab.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <tab.icon className="w-5 h-5" />{tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><span className="text-sm font-bold text-orange-600">{user?.name.charAt(0)}</span></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user?.name}</p><p className="text-xs text-gray-500">Admin</p></div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" />Sair</button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Calendar className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.totalEvents}</p><p className="text-xs text-gray-500">Eventos</p></div></div></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Users className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.totalRegistrations}</p><p className="text-xs text-gray-500">Inscrições</p></div></div></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><DollarSign className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold">R$ {toSafeNumber(stats.totalRevenue).toFixed(0)}</p><p className="text-xs text-gray-500">Receita</p></div></div></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><AlertCircle className="w-5 h-5 text-yellow-600" /></div><div><p className="text-2xl font-bold">{stats.pendingPayments}</p><p className="text-xs text-gray-500">Pendentes</p></div></div></div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Eventos</h1>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg"><Plus className="w-4 h-4" />Novo Evento</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Evento</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {races.map(race => (
                    <tr key={race.id}>
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><img src={race.image} alt="" className="w-12 h-12 rounded-lg object-cover" /><div><p className="font-medium text-sm">{race.name}</p><p className="text-xs text-gray-500">{race.city}</p></div></div></td>
                      <td className="px-6 py-4 text-sm">{format(parseISO(race.date), "dd/MM/yyyy")}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${race.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                            {race.published ? 'Publicado' : 'Rascunho'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRegistrationStatusColor(getRegistrationStatus(race))}`}>
                            {getRegistrationStatusText(getRegistrationStatus(race))}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingRace(race); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => { 
                              try {
                                await updateRace(race.id, { published: !race.published });
                              } catch (error) {
                                console.error('Erro ao atualizar publicação:', error);
                                showToast('Erro ao atualizar status. Tente novamente.', 'error');
                              }
                            }} 
                            className={`p-1.5 rounded ${race.published ? 'text-orange-600 hover:bg-orange-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            title={race.published ? 'Despublicar' : 'Publicar'}
                          >
                            {race.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={async () => { 
                              try {
                                const newStatus = race.registrationStatus === 'upcoming' ? 'closed' : 'upcoming';
                                await updateRace(race.id, { registrationStatus: newStatus });
                              } catch (error) {
                                console.error('Erro ao atualizar inscrições:', error);
                                showToast('Erro ao atualizar status. Tente novamente.', 'error');
                              }
                            }} 
                            className={`p-1.5 rounded ${race.registrationStatus === 'upcoming' ? 'text-slate-600 hover:bg-slate-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            title={race.registrationStatus === 'upcoming' ? 'Encerrar inscrições' : 'Reabrir inscrições'}
                          >
                            {race.registrationStatus === 'upcoming' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={async () => {
                            // Auditoria UX A1: bloquear exclusão de evento com inscritos.
                            const inscritos = registrations.filter(r => r.raceId === race.id).length;
                            if (inscritos > 0) {
                              showToast(`Não é possível excluir: este evento tem ${inscritos} inscrição(ões). Encerre as inscrições ou cancele-as antes.`, 'error', 6000);
                              return;
                            }
                            // Auditoria UX A5: modal acessível no lugar de window.confirm nativo.
                            const ok = await confirmAction({
                              title: 'Excluir evento',
                              message: `Excluir permanentemente o evento "${race.name}"?\n\nEsta ação não pode ser desfeita.`,
                              confirmLabel: 'Excluir',
                              danger: true,
                            });
                            if (ok) {
                            try {
                              await deleteRace(race.id);
                            } catch (error) {
                              console.error('Erro ao excluir:', error);
                              showToast('Erro ao excluir evento. Tente novamente.', 'error');
                            }
                          }}} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Inscrições</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToPDF(filteredRegistrations, races)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Exportar PDF
                </button>
                <button
                  onClick={() => exportToExcel(filteredRegistrations, races)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </button>
              </div>
            </div>

            {/* Filtros do relatório */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Buscar por nome, telefone, CPF, e-mail, código ou kit..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <select
                value={regFilterRace}
                onChange={(e) => setRegFilterRace(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos os eventos</option>
                {races.map(race => (
                  <option key={race.id} value={race.id}>{race.name}</option>
                ))}
              </select>
              <select
                value={regFilterStatus}
                onChange={(e) => setRegFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos os status</option>
                <option value="confirmed">Confirmados</option>
                <option value="pending">Pendentes</option>
              </select>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {filteredRegistrations.length} de {registrations.length} inscrições
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Participante</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Telefone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Evento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Camisa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                        Nenhuma inscrição encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : filteredRegistrations.map(reg => {
                    const race = races.find(r => r.id === reg.raceId);
                    return (
                      <tr key={reg.id}>
                        <td className="px-4 py-4 font-mono text-sm">{reg.confirmationCode}</td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-900">
                          {getParticipantName(reg)}
                          {reg.participantEmail && (
                            <p className="text-xs font-normal text-gray-500">{reg.participantEmail}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">{getParticipantPhone(reg)}</td>
                        <td className="px-4 py-4 text-sm">{race?.name || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm">{reg.kitName || '-'}</td>
                        <td className="px-4 py-4 text-sm">{reg.tshirtSize || 'N/A'}</td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${reg.status === 'confirmed' ? 'bg-green-100 text-green-700' : reg.status === 'pending_payment' ? 'bg-orange-100 text-orange-700' : reg.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{reg.status === 'confirmed' ? 'Confirmado' : reg.status === 'pending_payment' ? 'Aguardando pgto' : reg.status === 'cancelled' ? 'Cancelado' : 'Em processamento'}</span></td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedRegistration(reg)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Pagamentos</h1>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Método</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map(payment => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 font-mono text-sm">{payment.id}</td>
                      <td className="px-6 py-4 text-sm capitalize">{payment.method === 'pix' ? 'PIX' : 'Cartão'}</td>
                      <td className="px-6 py-4 text-sm font-semibold">R$ {formatBRL(payment.total)}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${payment.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{payment.status === 'approved' ? 'Aprovado' : 'Pendente'}</span></td>
                      <td className="px-6 py-4 text-right">{payment.status === 'pending' && <button onClick={async () => {
                        // Auditoria UX A2: confirmar com nome e valor antes de aprovar.
                        // Auditoria UX A5: modal acessível no lugar de window.confirm nativo.
                        const reg = registrations.find(r => r.id === payment.registrationId);
                        const nome = reg?.participantFirstName ? `${reg.participantFirstName} ${reg.participantLastName || ''}`.trim() : (reg?.userId?.slice(0, 8) || 'participante desconhecido');
                        const evento = reg ? (races.find(x => x.id === reg.raceId)?.name || '') : '';
                        const ok = await confirmAction({
                          title: 'Aprovar pagamento',
                          message: `Confirmar pagamento de ${nome}${evento ? ` (${evento})` : ''} no valor de R$ ${formatBRL(payment.total)}?\n\nIsto aprova o pagamento e CONFIRMA a inscrição correspondente. Use também para pagamentos recebidos em dinheiro/espécie.`,
                          confirmLabel: 'Aprovar pagamento',
                        });
                        if (!ok) return;
                        try {
                          await approvePayment(payment.id);
                        } catch (error) {
                          console.error('Erro ao aprovar pagamento:', error);
                          showToast('Erro ao aprovar pagamento. Tente novamente.', 'error');
                        }
                      }} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Aprovar pagamento"><CheckCircle className="w-4 h-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showForm && user && (
        <EventForm
          race={editingRace}
          organizerId={user.id}
          organizerName={user.name}
          onSave={async (data) => {
            try {
              if (editingRace) {
                await updateRace(editingRace.id, data);
              } else {
                await addRace(data);
              }
              setShowForm(false);
              setEditingRace(null);
            } catch (error) {
              console.error('Erro ao salvar evento:', error);
              showToast('Erro ao salvar evento. Tente novamente.', 'error');
            }
          }}
          onClose={() => { setShowForm(false); setEditingRace(null); }}
        />
      )}

      {selectedRegistration && (
        <RegistrationDetailsModal
          registration={selectedRegistration}
          race={races.find(r => r.id === selectedRegistration.raceId)}
          onClose={() => setSelectedRegistration(null)}
        />
      )}
    </div>
  );
}
