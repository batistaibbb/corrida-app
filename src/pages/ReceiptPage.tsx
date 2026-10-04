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
import { ArrowLeft, CheckCircle, CreditCard, Download, QrCode, Trophy, User } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getKitLabel, getParticipantName } from './registrationHelpers';

export default function ReceiptPage() {
  const { registrationId } = useParams();
  const { user } = useAuth();
  const { registrations, getRaceById, getPaymentByRegistration } = useData();
  const navigate = useNavigate();
  // Fallback: se a inscrição ainda não está na lista (ex.: recarregou antes do refresh),
  // tenta buscá-la direto no Supabase para evitar tela em branco.
  const [fetchedRegistration, setFetchedRegistration] = useState<Registration | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchFallback() {
      if (!registrationId || isDemoMode || !supabase) { setFetchAttempted(true); return; }
      if (registrations.some(r => r.id === registrationId)) { setFetchAttempted(true); return; }
      try {
        const { data } = await supabase
          .from('registrations')
          .select('*')
          .eq('id', registrationId)
          .maybeSingle();
        if (!cancelled && data) {
          setFetchedRegistration({
            id: data.id,
            userId: data.user_id ?? data.userId,
            raceId: data.race_id ?? data.raceId,
            distance: Number(data.distance ?? 0),
            tshirtSize: data.tshirt_size ?? data.tshirtSize ?? '',
            kitId: data.kit_id ?? data.kitId,
            kitName: data.kit_name ?? data.kitName,
            price: data.price != null ? Number(data.price) : undefined,
            status: data.status,
            paymentId: data.payment_id ?? data.paymentId,
            confirmationCode: data.confirmation_code ?? data.confirmationCode ?? '',
            createdAt: data.created_at ?? data.createdAt,
            emergencyName: data.emergency_name ?? data.emergencyName ?? '',
            emergencyPhone: data.emergency_phone ?? data.emergencyPhone ?? '',
            participantFirstName: data.participant_first_name ?? undefined,
            participantLastName: data.participant_last_name ?? undefined,
            participantEmail: data.participant_email ?? undefined,
            participantPhone: data.participant_phone ?? undefined,
            participantCpf: data.participant_cpf ?? undefined,
          });
        }
      } catch (err) {
        console.error('Erro ao buscar inscrição:', err);
      } finally {
        if (!cancelled) setFetchAttempted(true);
      }
    }
    fetchFallback();
    return () => { cancelled = true; };
  }, [registrationId, registrations]);

  const registration = registrations.find(r => r.id === registrationId) || fetchedRegistration;
  const race = registration ? getRaceById(registration.raceId) : null;
  const payment = registration ? getPaymentByRegistration(registration.id) : null;

  // Auditoria UX G7: QR Code do código de confirmação para leitura na retirada do kit.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const code = registration?.confirmationCode;
    if (!code || isDemoMode) { setQrDataUrl(null); return; }
    QRCode.toDataURL(String(code), { width: 320, margin: 1 })
      .then(url => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { /* QR é opcional — o código em texto continua visível */ });
    return () => { cancelled = true; };
  }, [registration?.confirmationCode]);

  if (!registration && !fetchAttempted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="ml-3 text-gray-600">Carregando comprovante...</p>
      </div>
    );
  }

  if (!registration || !race || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-slate-900 mb-1">Comprovante não encontrado</p>
          <p className="text-sm text-slate-500 mb-4">Não foi possível carregar os dados desta inscrição.</p>
          <button onClick={() => navigate('/minha-conta')} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
            Minhas inscrições
          </button>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-slate-900 mb-1">Pagamento ainda não registrado</p>
          <p className="text-sm text-slate-500 mb-4">Assim que o pagamento for confirmado, o comprovante aparecerá aqui.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
            Atualizar
          </button>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    // Gera o comprovante em PDF (jsPDF já incluído no projeto)
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 20;
    let y = 0;

    // Cabeçalho com gradiente (faixa sólida em verde)
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SMART BRASIL TICKET', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprovante de Inscrição Confirmada', pageW / 2, 23, { align: 'center' });

    y = 44;

    // Status de confirmação
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PAGAMENTO CONFIRMADO', pageW / 2, y, { align: 'center' });
    y += 10;

    // Código de confirmação
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Código de Confirmação', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(16);
    doc.setFont('courier', 'bold');
    doc.text(registration.confirmationCode || '-', pageW / 2, y, { align: 'center' });
    y += 10;

    // G7: QR Code do código de confirmação (leitura na retirada do kit)
    try {
      const qr = await QRCode.toDataURL(String(registration.confirmationCode || ''), { width: 320, margin: 1 });
      doc.addImage(qr, 'PNG', (pageW - 40) / 2, y, 40, 40);
      y += 44;
    } catch { /* sem QR — o código em texto acima já basta */ }

    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, y, pageW - marginX, y);
    y += 10;

    const sectionTitle = (title: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(5, 150, 105);
      doc.text(title.toUpperCase(), marginX, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
    };
    const row = (label: string, value: string) => {
      doc.setTextColor(100, 116, 139);
      doc.text(`${label}:`, marginX, y);
      doc.setTextColor(30, 41, 59);
      doc.text(value || '-', marginX + 45, y);
      y += 6;
    };

    sectionTitle('Evento');
    row('Nome', race.name);
    row('Data', `${format(parseISO(race.date), 'dd/MM/yyyy')} às ${race.time || ''}`.trim());
    row('Local', `${race.location || ''}, ${race.city || ''}/${race.state || ''}`);
    y += 4;

    sectionTitle('Participante');
    // G7: dados do PARTICIPANTE da inscrição (não da conta de login — pode ser pai/mãe inscrevendo filho)
    const partName = [registration.participantFirstName, registration.participantLastName].filter(Boolean).join(' ') || user.name;
    row('Nome', partName);
    row('CPF', registration.participantCpf || user.cpf);
    if (registration.participantEmail) row('E-mail', registration.participantEmail);
    if (registration.participantPhone) row('Telefone', registration.participantPhone);
    y += 4;

    sectionTitle('Retirada do Kit');
    row('Data/Hora', race.kitPickup ? String(race.kitPickup) : 'Consulte o e-mail de confirmação do organizador');
    row('Local', race.kitPickupLocation || race.location || 'A definir pelo organizador');
    y += 4;

    sectionTitle('Inscrição');
    if (registration.kitName) row('Kit', registration.kitName);
    if (registration.distance) row('Distância', `${registration.distance} km`);
    if (registration.tshirtSize) row('Camiseta', `Tam. ${registration.tshirtSize}`);
    y += 4;

    sectionTitle('Pagamento');
    row('Método', `${payment.method === 'pix' ? 'PIX' : 'Cartão'} (Mercado Pago)`);
    row('Inscrição', `R$ ${formatBRL(payment.amount)}`);
    row('Taxa', `R$ ${formatBRL(toSafeNumber(payment.total) - toSafeNumber(payment.amount))}`);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105);
    row('TOTAL', `R$ ${formatBRL(payment.total)}`);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    row('Status', 'APROVADO');
    row('Transação', String(payment.transactionId || '-'));
    y += 8;

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} - Smart Brasil Ticket`, pageW / 2, 285, { align: 'center' });
    doc.text('Apresente este comprovante (código de confirmação) na retirada do kit.', pageW / 2, 290, { align: 'center' });

    doc.save(`comprovante-${registration.confirmationCode}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            <div><h1 className="font-bold text-slate-900">Comprovante</h1><p className="text-sm text-slate-500">{registration.confirmationCode}</p></div>
          </div>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg text-sm font-medium hover:from-emerald-700 hover:to-sky-700 transition-all">
            <Download className="w-4 h-4" /> Baixar
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-emerald-600 to-sky-600 p-6 text-center">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white">Pagamento Confirmado!</h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center pb-6 border-b border-slate-200">
              <p className="text-xs text-slate-500 uppercase">Código de Confirmação</p>
              <p className="text-3xl font-mono font-bold text-slate-900">{registration.confirmationCode}</p>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900"><Trophy className="w-5 h-5 text-emerald-600" /> Evento</h3>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="font-semibold text-slate-900">{race.name}</p>
                <p className="text-sm text-slate-600">{format(parseISO(race.date), "dd/MM/yyyy")} às {race.time}</p>
                <p className="text-sm text-slate-600">{race.location}, {race.city}/{race.state}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900"><User className="w-5 h-5 text-sky-600" /> Participante</h3>
              {/* G7: dados do participante da inscrição (quem corre), com fallback p/ conta de login */}
              {(() => {
                const partName = [registration.participantFirstName, registration.participantLastName].filter(Boolean).join(' ') || user.name;
                return (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-slate-500">Nome</p><p className="font-medium text-slate-900">{partName}</p></div>
                    <div><p className="text-slate-500">CPF</p><p className="font-medium text-slate-900">{registration.participantCpf || user.cpf}</p></div>
                    {(registration.participantEmail || registration.participantPhone) && (
                      <>
                        <div><p className="text-slate-500">E-mail</p><p className="font-medium text-slate-900 break-all">{registration.participantEmail || user.email}</p></div>
                        <div><p className="text-slate-500">Telefone</p><p className="font-medium text-slate-900">{registration.participantPhone || user.phone}</p></div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900"><QrCode className="w-5 h-5 text-emerald-600" /> Retirada do Kit</h3>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR Code do código ${registration.confirmationCode}`} className="w-40 h-40 mx-auto rounded-lg bg-white p-2 border border-slate-200" />
                ) : (
                  <p className="text-xs text-slate-400 text-center">Apresente o código acima na retirada.</p>
                )}
                <p className="text-xs text-slate-500 text-center">Mostre este QR Code (ou digite o código) na retirada do kit.</p>
                <div className="text-sm">
                  <p className="text-slate-500">Quando</p>
                  <p className="font-medium text-slate-900">{race.kitPickup || 'Será informado pelo organizador — acompanhe seu e-mail.'}</p>
                  <p className="text-slate-500 mt-2">Onde</p>
                  <p className="font-medium text-slate-900">{race.kitPickupLocation || race.location || 'A definir pelo organizador'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900"><CreditCard className="w-5 h-5 text-emerald-600" /> Pagamento</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Método</span><span className="font-medium text-slate-900">{payment.method === 'pix' ? 'PIX' : 'Cartão'} (Mercado Pago)</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Inscrição</span><span className="text-slate-900">R$ {formatBRL(payment.amount)}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold text-slate-900">Total</span><span className="font-bold text-xl text-emerald-600">R$ {formatBRL(payment.total)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Transação</span><span className="font-mono text-xs text-slate-700">{payment.transactionId}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link to="/minha-conta" className="flex-1 py-3 border border-slate-300 rounded-xl text-center font-medium text-slate-700 hover:bg-slate-50 transition-colors">Minhas Inscrições</Link>
          <Link to="/" className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-xl text-center font-medium hover:from-emerald-700 hover:to-sky-700 transition-all">Ver Mais Eventos</Link>
        </div>
      </div>
    </div>
  );
}

// Helpers do relatório: nome/contato do participante com fallbacks
// (inscrições antigas não têm os campos persistidos; tenta o perfil demo)
