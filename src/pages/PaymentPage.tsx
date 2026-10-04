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
import { ArrowLeft, Check, CheckCircle, Copy, CreditCard, QrCode, Shield } from 'lucide-react';

export default function PaymentPage() {
  const { registrationId } = useParams();
  const { user } = useAuth();
  const { registrations, races, getRaceById, addPayment, updateRegistration } = useData();
  const navigate = useNavigate();
  // Fallback: se a inscrição ainda não estiver na lista em memória (ex.: recarregamento
  // da página, realtime atrasado ou falha de sync), busca direto no Supabase para
  // evitar tela em branco.
  const [fetchedRegistration, setFetchedRegistration] = useState<Registration | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [fetchedRace, setFetchedRace] = useState<Race | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchFallback() {
      if (!registrationId || isDemoMode || !supabase) { setFetchAttempted(true); return; }
      if (registrations.some(r => r.id === registrationId)) { setFetchAttempted(true); return; }
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .eq('id', registrationId)
          .maybeSingle();
        if (error) console.error('Erro ao buscar inscrição:', error);
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

  // Fallback para o evento: se a inscrição foi buscada direto do banco mas o evento
  // correspondente ainda não está na lista em memória, busca o evento também.
  const regForLookup = registrations.find(r => r.id === registrationId) || fetchedRegistration;
  useEffect(() => {
    let cancelled = false;
    async function fetchRace() {
      const raceId = regForLookup?.raceId;
      if (!raceId || isDemoMode || !supabase) return;
      if (races.some(r => r.id === raceId)) return;
      try {
        const { data } = await supabase.from('races').select('*').eq('id', raceId).maybeSingle();
        if (!cancelled && data) {
          setFetchedRace({
            ...data,
            image: data.image_url || data.image,
            organizer: data.organizer_name || data.organizer,
            organizerId: data.organizer_id || data.organizerId,
            participants: data.participants_count || data.participants || 0,
            maxParticipants: data.max_participants || data.maxParticipants || 1000,
            registrationStatus: data.registration_status || 'upcoming',
            includes: data.includes || [],
            rules: data.rules || [],
            rating: data.rating || 0,
            reviews: data.reviews_count || data.reviews || 0,
            tags: data.tags || [],
            distances: data.distances || [],
            kits: data.kits || [],
            shirtSizes: data.shirt_sizes || ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
            createdAt: data.created_at,
          } as Race);
        }
      } catch (err) {
        console.error('Erro ao buscar evento:', err);
      }
    }
    fetchRace();
    return () => { cancelled = true; };
  }, [regForLookup?.raceId, races]);

  const registration = regForLookup;
  const race = registration ? (getRaceById(registration.raceId) || (fetchedRace?.id === registration.raceId ? fetchedRace : null)) : null;

  // Preço: prioriza o preço salvo na inscrição; senão procura o kit pelo ID OU pelo
  // nome (o kit pode ter sido recriado/renumerado pelo admin após a inscrição);
  // por fim tenta as distâncias como legado. SEMPRE normalizado com toSafeNumber —
  // qualquer valor null/string/vindo do banco deixa de ser capaz de derrubar a tela.
  const findKitPrice = (): number => {
    const kits: any[] = race?.kits || [];
    const byId = kits.find(k => k.id === registration?.kitId);
    const byName = registration?.kitName ? kits.find(k => k.name === registration.kitName) : undefined;
    const kit = byId || byName;
    return toSafeNumber(kit?.price);
  };
  const rawPrice = toSafeNumber(registration?.price);
  const distanceLegacyPrice = toSafeNumber(race?.distances?.find(d => d.km === registration?.distance)?.price);
  const kitPrice = rawPrice > 0 ? rawPrice : (findKitPrice() || distanceLegacyPrice);
  const total = kitPrice;
  const distancePrice = kitPrice;

  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'credit_card' | 'debit_card' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pixGenerated, setPixGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '', installments: '1' });
  // Integração Mercado Pago (Checkout Pro): estado da confirmação automática de pagamento
  const [mpError, setMpError] = useState<string | null>(null);
  const [mpConfirming, setMpConfirming] = useState(false);
  // Auditoria UX G2: controle do polling — permite mensagem final e botão manual.
  const [mpPolling, setMpPolling] = useState(false);
  const [mpPollTimedOut, setMpPollTimedOut] = useState(false);
  const mpPollRef = useRef<number | null>(null);

  useEffect(() => () => { if (mpPollRef.current) window.clearInterval(mpPollRef.current); }, []);

  // Inscrição já paga/confirmada: não exibe a tela de pagamento (evita cobrança duplicada)
  useEffect(() => {
    if (registration?.status === 'confirmed') {
      navigate(`/comprovante/${registration.id}`, { replace: true });
    }
  }, [registration?.status, registration?.id]);

  // ============================================
  // CONFIRMAÇÃO AUTOMÁTICA DE PAGAMENTO (Mercado Pago)
  // ============================================
  // Camada 1: webhook mercadopago-webhook atualiza payments/registrations no banco.
  // Camada 2: ao voltar do checkout (?status=approved), confirmamos direto na API
  //           do MP e gravamos no banco caso o webhook ainda não tenha chegado.
  // Camada 3: polling no banco (Supabase Realtime em payments já recarrega a lista,
  //           mas aqui consultamos explicitamente) até status != pending.
  // Consulta o status direto no banco usando a MESMA técnica do login:
  // API REST do Supabase com anon key. Funciona em aba anônima e não trava
  // em RLS nem em sessão expirada (a Edge Function grava via service role).
  const queryRegistrationStatus = async (): Promise<string | null> => {
    try {
      const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || supabaseAnonKeySafe;
      const res = await fetch(
        `${supabaseUrlSafe}/rest/v1/registrations?id=eq.${registration!.id}&select=id,status,payment_id`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' } }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      return Array.isArray(rows) && rows.length ? String(rows[0].status) : null;
    } catch {
      return null;
    }
  };

  const syncRegistrationStatus = async () => {
    const status = await queryRegistrationStatus();
    if (status === 'confirmed') {
      navigate(`/comprovante/${registration!.id}`);
      return true;
    }
    return false;
  };

  const startStatusPolling = () => {
    if (mpPollRef.current) window.clearInterval(mpPollRef.current);
    setMpPolling(true);
    setMpPollTimedOut(false);
    let attempts = 0;
    mpPollRef.current = window.setInterval(async () => {
      attempts += 1;
      if (attempts > 60) { // ~3 min
        if (mpPollRef.current) window.clearInterval(mpPollRef.current);
        // Auditoria UX G2: polling parava em silêncio. Agora avisa o usuário
        // e oferece verificação manual.
        setMpPolling(false);
        setMpPollTimedOut(true);
        return;
      }
      const done = await syncRegistrationStatus();
      if (done) {
        setMpPolling(false);
        if (mpPollRef.current) window.clearInterval(mpPollRef.current);
      }
    }, 3000);
  };

  // Auditoria UX G2: botão "Verificar agora" — consulta única fora do intervalo.
  const verifyPaymentNow = async () => {
    const done = await syncRegistrationStatus();
    if (!done) {
      // Retenta por mais um ciclo de polling curto
      startStatusPolling();
    }
  };

  // Confirmação server-side via Edge Function (usa token seguro, sem expor credenciais)
  const confirmCheckoutPayment = async (mpPaymentId: string) => {
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || supabaseAnonKeySafe;
    let accessToken: string | undefined;
    try {
      const sessionRes = await supabase?.auth.getSession();
      accessToken = sessionRes?.data?.session?.access_token;
    } catch { /* segue sem sessão */ }
    const fnUrl = `${supabaseUrlSafe}/functions/v1/confirm-checkout-payment`;
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${accessToken || anonKey}`,
        'x-app-url': window.location.origin,
      },
      body: JSON.stringify({ registrationId: registration!.id, mpPaymentId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  };

  // Detecta retorno do checkout do Mercado Pago (?status=...&collection_id=.../&payment_id=...)
  useEffect(() => {
    if (isDemoMode || !supabase || !registration) return;
    const params = new URLSearchParams(window.location.search);
    const st = params.get('status');
    if (!st) return;
    const collectionId = params.get('collection_id') || params.get('payment_id') || params.get('collector_id');

    // Limpa a query string para não reprocessar ao recarregar
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    (async () => {
      setMpConfirming(true);
      setMpError(null);
      try {
        if (st === 'approved' && collectionId) {
          try {
            await confirmCheckoutPayment(collectionId);
          } catch (err: any) {
            console.warn('Confirmação direta falhou, dependendo do webhook:', err);
          }
        }
        // Verifica o status final no banco (webhook pode ter confirmado antes)
        const confirmed = await syncRegistrationStatus();
        if (!confirmed) {
          if (st === 'approved') {
            // Webhook ainda não chegou — aguarda via polling
            startStatusPolling();
          } else if (st === 'rejected' || st === 'failure') {
            setMpError('O pagamento foi recusado ou cancelado. Você pode tentar novamente com outra forma de pagamento.');
          } else {
            // pending (PIX/cartão em processamento)
            setMpError('Pagamento em processamento. Assim que for aprovado, sua inscrição é confirmada automaticamente — esta página atualiza sozinha.');
            startStatusPolling();
          }
        }
      } finally {
        setMpConfirming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registration]);

  // ============================================
  // INICIAR CHECKOUT MERCADO PAGO (produção)
  // ============================================

  // Enquanto o fallback de busca está em andamento, mostra carregamento (evita
  // "piscar" a tela de erro e depois sumir).
  if (!registration && !fetchAttempted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="ml-3 text-gray-600">Carregando sua inscrição...</p>
      </div>
    );
  }

  if (!registration || !user) {
    // Em vez de sumir a tela, mostra um estado claro com ação de voltar
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-slate-900 mb-1">Não encontramos sua inscrição</p>
          <p className="text-sm text-slate-500 mb-4">Pode ser que ela ainda não tenha sincronizado. Volte e tente novamente.</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-slate-900 mb-1">Evento não encontrado</p>
          <p className="text-sm text-slate-500 mb-4">O evento desta inscrição não pôde ser carregado. Verifique sua conexão e tente novamente.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
              Tentar novamente
            </button>
            <button onClick={() => navigate('/')} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bloqueia pagamento de inscrição sem preço válido (ex.: kit salvo no banco com
  // price null e coluna price da inscrição ausente). Mostra estado claro em vez de
  // renderizar uma tela de pagamento quebrada.
  if (total <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <p className="font-bold text-slate-900 mb-1">Valor da inscrição não definido</p>
          <p className="text-sm text-slate-500 mb-4">
            O preço do kit "{registration.kitName || 'selecionado'}" está vazio ou inválido no cadastro do evento.
            Peça ao organizador para editar o evento e preencher o preço do kit, depois volte a esta página.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
              Tentar novamente
            </button>
            <button onClick={() => navigate('/')} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pixCode = `00020126580014br.gov.bcb.pix0136${registration.confirmationCode}520400005303986540${toSafeNumber(total).toFixed(2)}5802BR5925SMARTBRASIL6009SAO PAULO6304ABCD`;

  const openMercadoPagoCheckout = async () => {
    setProcessing(true);
    setMpError(null);
    try {
      const supabaseUrl = supabaseUrlSafe;
      const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || supabaseAnonKeySafe;
      let accessToken: string | undefined;
      try {
        const sessionRes = await supabase?.auth.getSession();
        accessToken = sessionRes?.data?.session?.access_token;
      } catch { /* segue sem sessão */ }

      // Se não houver sessão ativa (janela anônima, sessão expirada ou login
      // antigo do modo demo), usamos a anon key. A Edge Function detecta que
      // não é um usuário autenticado e usa o service role no servidor para
      // validar a inscrição pelo ID — o fluxo continua funcionando.
      const bearerToken = accessToken || anonKey;
      if (!bearerToken) {
        throw new Error('Configuração incompleta: chave pública do Supabase ausente neste build.');
      }

      let res: Response;
      try {
        res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${bearerToken}`,
            'x-app-url': window.location.origin,
          },
          body: JSON.stringify({ registrationId: registration!.id }),
        });
      } catch {
        // fetch só lança exceção quando a requisição NEM SAI do navegador
        // (domínio errado/inexistente, DNS, rede ou CORS). Mostra diagnóstico claro.
        throw new Error(
          `Não foi possível conectar ao servidor de pagamentos (${supabaseUrl || 'VITE_SUPABASE_URL vazio'}). ` +
          'Verifique se as Edge Functions estão ativas no Supabase.'
        );
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error || !json?.checkoutUrl) {
        throw new Error(json?.error || `Falha ao iniciar checkout no Mercado Pago (HTTP ${res.status})`);
      }
      // Redireciona para o checkout oficial do Mercado Pago.
      // Ao concluir, o MP devolve o usuário para /pagamento/:id?status=... e o
      // webhook atualiza o banco automaticamente em paralelo.
      window.location.href = json.checkoutUrl;
    } catch (err: any) {
      const msg = typeof err?.message === 'string' && err.message.trim()
        ? err.message
        : 'Não foi possível iniciar o pagamento. Tente novamente.';
      setMpError(msg);
      // Log completo para diagnóstico no console (F12)
      console.error('[MercadoPago] Erro ao criar checkout:', err);
      setProcessing(false);
    }
  };

  const handlePixPayment = openMercadoPagoCheckout;
  const handleCardPayment = () => {
    if (!isDemoMode) {
      // Auditoria UX G3: produção não usa formulário de cartão local — o Checkout Pro
      // do MP cuida de PIX/cartão/débito/parcelas (dados de cartão nunca passam pelo site).
      openMercadoPagoCheckout();
      return;
    }
    {
      // Modo demo: mantém o fluxo de demonstração local
      if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
        showToast('Preencha todos os dados do cartão', 'error');
        return;
      }
      setProcessing(true);
      setTimeout(async () => {
        const method = cardData.installments === '1' ? 'debit_card' : 'credit_card';
        const id = await addPayment({
          registrationId: registration.id,
          method,
          amount: distancePrice,
          serviceFee: 0,
          total,
          status: 'approved',
          transactionId: `MP-CARD-${Date.now()}`,
          paidAt: new Date().toISOString(),
        });
        await updateRegistration(registration.id, { status: 'confirmed', paymentId: id });
        setProcessing(false);
        navigate(`/comprovante/${registration.id}`);
      }, 2000);
    }
  };

  const simulatePixApproval = () => {
    if (!isDemoMode) return; // Auditoria UX P4: simulação só existe no modo demo
    if (paymentId) {
      const payments = JSON.parse(localStorage.getItem('rb_payments') || '[]');
      const updated = payments.map((p: any) => p.id === paymentId ? { ...p, status: 'approved', paidAt: new Date().toISOString() } : p);
      localStorage.setItem('rb_payments', JSON.stringify(updated));
      
      const regs = JSON.parse(localStorage.getItem('rb_registrations') || '[]');
      const updatedRegs = regs.map((r: any) => r.id === registration.id ? { ...r, status: 'confirmed', paymentId } : r);
      localStorage.setItem('rb_registrations', JSON.stringify(updatedRegs));
      
      navigate(`/comprovante/${registration.id}`);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="font-bold">Pagamento</h1><p className="text-sm text-gray-500">{race.name} - {registration.distance}km</p></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold mb-4">Resumo do Pedido</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Inscrição {registration.distance}km</span><span>R$ {formatBRL(distancePrice)}</span></div>
                <div className="flex justify-between pt-3 border-t font-bold text-lg"><span>Total</span><span className="text-orange-600">R$ {formatBRL(total)}</span></div>
              </div>
            </div>

            {!pixGenerated ? (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                {mpConfirming && (
                  <div className="mb-4 flex items-center gap-3 p-4 bg-sky-50 border border-sky-200 rounded-xl">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
                    <p className="text-sm text-sky-800 font-medium">Confirmando seu pagamento junto ao Mercado Pago...</p>
                  </div>
                )}
                {/* Auditoria UX G2: feedback durante e APÓS o fim do polling */}
                {mpPolling && !mpConfirming && (
                  <div className="mb-4 flex items-center gap-3 p-4 bg-sky-50 border border-sky-200 rounded-xl">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
                    <p className="text-sm text-sky-800 font-medium">Aguardando a confirmação do pagamento... esta página atualiza sozinha assim que o Mercado Pago aprovar.</p>
                  </div>
                )}
                {mpPollTimedOut && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <p className="text-sm text-amber-800">
                      O pagamento ainda não foi confirmado após alguns minutos. Se você já concluiu o pagamento no Mercado Pago, ele pode estar em processamento — verifique agora ou confira sua inscrição mais tarde em <strong>Minha Conta</strong>.
                    </p>
                    <button onClick={verifyPaymentNow} className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors">
                      Verificar agora
                    </button>
                  </div>
                )}
                {mpError && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">{mpError}</p>
                  </div>
                )}
                <h2 className="font-bold mb-4">Pagamento</h2>

                {!isDemoMode ? (
                  <>
                {/* Auditoria UX G3: um único botão. PIX/cartão/débito/parcelas são
                    escolhidos dentro do Checkout Pro do Mercado Pago — aqui só
                    mostramos as opções como informação, sem seleção que não tem efeito. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <QrCode className="w-5 h-5 mb-2 text-emerald-600" />
                    <p className="font-bold text-sm">PIX</p>
                    <p className="text-xs text-gray-500">Aprovação instantânea</p>
                  </div>
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <CreditCard className="w-5 h-5 mb-2 text-sky-600" />
                    <p className="font-bold text-sm">Cartão de crédito ou débito</p>
                    <p className="text-xs text-gray-500">Em até 12x no checkout seguro</p>
                  </div>
                </div>

                <button onClick={openMercadoPagoCheckout} disabled={processing || mpConfirming} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-sky-700 transition-all">
                  <Shield className="w-4 h-4" />
                  {processing ? 'Redirecionando para o Mercado Pago...' : `Pagar R$ ${formatBRL(total)} no Mercado Pago`}
                </button>
                <p className="text-xs text-slate-400 mt-3 text-center">
                  Você será redirecionado para o ambiente seguro do Mercado Pago, onde escolhe PIX ou cartão. Ao concluir, volta automaticamente e a inscrição é confirmada sem ação manual.
                </p>
                  </>
                ) : (
                  <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <button onClick={() => setSelectedMethod('pix')} className={`p-4 rounded-xl border-2 text-left ${selectedMethod === 'pix' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <QrCode className={`w-5 h-5 mb-2 ${selectedMethod === 'pix' ? 'text-orange-600' : 'text-gray-500'}`} />
                    <p className="font-bold text-sm">PIX</p>
                    <p className="text-xs text-gray-500">Aprovação instantânea via Mercado Pago</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">5% desconto</span>
                  </button>
                  <button onClick={() => setSelectedMethod('credit_card')} className={`p-4 rounded-xl border-2 text-left ${selectedMethod === 'credit_card' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <CreditCard className={`w-5 h-5 mb-2 ${selectedMethod === 'credit_card' ? 'text-orange-600' : 'text-gray-500'}`} />
                    <p className="font-bold text-sm">Cartão</p>
                    <p className="text-xs text-gray-500">Crédito em até 12x via Mercado Pago</p>
                  </button>
                </div>

                {selectedMethod === 'pix' && (
                  <button onClick={handlePixPayment} disabled={processing} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50 hover:from-emerald-700 hover:to-sky-700 transition-all">
                    {processing ? 'Gerando PIX...' : 'Gerar PIX'}
                  </button>
                )}

                {selectedMethod === 'credit_card' && (
                  <div className="space-y-3">
                    <input type="text" value={cardData.number} onChange={(e) => setCardData({...cardData, number: e.target.value})} placeholder="Número do cartão" maxLength={19} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    <input type="text" value={cardData.name} onChange={(e) => setCardData({...cardData, name: e.target.value})} placeholder="Nome no cartão" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={cardData.expiry} onChange={(e) => setCardData({...cardData, expiry: e.target.value})} placeholder="MM/AA" maxLength={5} className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                      <input type="text" value={cardData.cvv} onChange={(e) => setCardData({...cardData, cvv: e.target.value})} placeholder="CVV" maxLength={4} className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <select value={cardData.installments} onChange={(e) => setCardData({...cardData, installments: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500">
                      <option value="1">1x de R$ {formatBRL(total)} (sem juros)</option>
                      <option value="2">2x de R$ {formatBRL(total / 2)} (sem juros)</option>
                      <option value="3">3x de R$ {formatBRL(total / 3)} (sem juros)</option>
                      <option value="6">6x de R$ {formatBRL(total / 6 * 1.05)} (com juros)</option>
                      <option value="12">12x de R$ {formatBRL(total / 12 * 1.12)} (com juros)</option>
                    </select>
                    <button onClick={handleCardPayment} disabled={processing} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-sky-700 transition-all">
                      <Shield className="w-4 h-4" />
                      {processing ? 'Processando...' : `Pagar R$ ${formatBRL(total)}`}
                    </button>
                  </div>
                )}
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <QrCode className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2 text-slate-900">Pague com PIX</h2>
                <p className="text-sm text-slate-500 mb-6">Escaneie o QR Code ou copie o código</p>
                <div className="w-56 h-56 mx-auto bg-slate-100 rounded-xl mb-6 flex items-center justify-center">
                  <div className="text-slate-400">QR Code</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-slate-500 mb-1">Código PIX:</p>
                  <p className="text-xs font-mono break-all text-slate-700">{pixCode}</p>
                  <button onClick={copyPixCode} className="mt-2 text-xs text-emerald-600 flex items-center gap-1 mx-auto hover:text-emerald-700">
                    {copied ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar código</>}
                  </button>
                </div>
                <button onClick={simulatePixApproval} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-sky-700 transition-all">
                  Simular Aprovação (Demo)
                </button>
                <p className="text-xs text-slate-400 mt-2">Em produção, aprovação é automática via webhook Mercado Pago</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm h-fit sticky top-20">
            <h3 className="font-bold mb-3">Segurança</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2"><Shield className="w-4 h-4 text-green-500 mt-0.5" /><span>Pagamento seguro via Mercado Pago</span></div>
              <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-orange-500 mt-0.5" /><span>Confirmação instantânea</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
