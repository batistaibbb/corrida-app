// ============================================
// CREATE CHECKOUT PAYMENT (MERCADO PAGO) - SUPABASE EDGE FUNCTION
// ============================================
// Deploy: supabase functions deploy create-checkout-payment
//
// Cria uma "preferência" de Checkout Pro no Mercado Pago e devolve o
// init_point (URL oficial de checkout). O pagamento é concluído na
// página do Mercado Pago (PIX, cartão, boleto...) — seguro, sem tocar
// dados de cartão no nosso frontend.
//
// ATUALIZAÇÃO AUTOMÁTICA DE STATUS:
//   1. notification_url -> mercadopago-webhook atualiza payments + registrations
//      no banco assim que o MP aprova/rejeita o pagamento.
//   2. back_urls (success/failure/pending) -> o comprador volta para o nosso
//      site, onde a PaymentPage confirma o status direto na API do MP.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Variáveis de ambiente: aceita tanto os secrets customizados criados no
// dashboard (PROJECT_URL / ANON_KEY / SERVICE_ROLE_KEY) quanto as variáveis
// nativas do Supabase, caso existam. Assim funciona independentemente de
// qual nome foi usado na configuração.
const getEnv = (...names: string[]): string => {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return v;
  }
  return "";
};

const PROJECT_URL = () => getEnv("PROJECT_URL", "SUPABASE_URL");
const ANON_KEY = () => getEnv("ANON_KEY", "SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = () => getEnv("SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // IMPORTANTE: a lista abaixo precisa cobrir TODO header enviado pelo navegador.
  // O SDK do Supabase envia automaticamente "x-supabase-access-token" quando há
  // sessão ativa — se ele não estiver autorizado no preflight, o CORS bloqueia a
  // requisição e o site mostra "Não foi possível conectar ao servidor".
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-url, x-supabase-api-version, x-supabase-access-token, x-canonical-url, x-session-id",
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    // max-age cacheia o preflight por 1 dia, reduzindo travas de CORS repetidas
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, "Access-Control-Max-Age": "86400" },
    });
  }

  try {
    const { registrationId } = await req.json().catch(() => ({}));
    if (!registrationId) throw new Error("registrationId obrigatório");

    const authHeader = req.headers.get("Authorization");

    // Cliente com o token do usuário (se houver). Sem header de auth,
    // getUser() simplesmente retorna user = null e caímos no modo serviço.
    const supabase = createClient(PROJECT_URL(), ANON_KEY(), {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    let user = null as any;
    if (authHeader) {
      try {
        user = (await supabase.auth.getUser()).data.user;
      } catch {
        user = null;
      }
    }

    // Fallback: aba anônima / sessão expirada -> service role (bypassa RLS).
    // A inscrição é buscada por ID; a surface de risco é mínima porque o
    // checkout só devolve a URL do Mercado Pago para o próprio pagador.
    let supabaseAdmin = null as any;
    if (!user) {
      const serviceKey = SERVICE_ROLE_KEY();
      if (!serviceKey) throw new Error("Usuário não autenticado e SERVICE_ROLE_KEY não configurada");
      supabaseAdmin = createClient(PROJECT_URL(), serviceKey);
    }

    const db = supabaseAdmin ?? supabase;

    let registration = null as any;
    let regError: any = null;
    if (supabaseAdmin) {
      const r = await db.from("registrations").select("*, races(name)").eq("id", registrationId).maybeSingle();
      registration = r.data;
      regError = r.error;
    } else {
      const r = await db.from("registrations").select("*, races(name)").eq("id", registrationId).eq("user_id", user.id).single();
      registration = r.data;
      regError = r.error;
    }

    if (regError || !registration) throw new Error("Inscrição não encontrada.");
    // Preço: usa o salvo na inscrição; senão procura o kit pelo ID/nome no JSON
    // do evento; por fim as distâncias (legado). Tudo defensivo contra null/string.
    let amount = Number(registration.price ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      const raceRow = await db
        .from("races")
        .select("kits, distances")
        .eq("id", registration.race_id)
        .maybeSingle();
      const kits = raceRow.data?.kits ?? [];
      const distances = raceRow.data?.distances ?? [];
      const kit =
        kits.find((k: any) => k.id === registration.kit_id) ||
        kits.find((k: any) => k.name === registration.kit_name);
      const dist = distances.find((d: any) => Number(d.km) === Number(registration.distance));
      amount = Number(kit?.price ?? dist?.price ?? 0);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("O kit desta inscrição está sem preço válido. Peça ao organizador para preencher o preço do kit.");
    }
    amount = Math.round(amount * 100) / 100;

    const appUrl =
      Deno.env.get("APP_URL") ||
      req.headers.get("x-app-url") ||
      "https://smartbrasilticket.vercel.app";

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado na Edge Function");

    const eventName = registration.races?.name || "Inscrição Smart Brasil Ticket";
    const description = `Inscrição - ${eventName}${registration.kit_name ? ` (${registration.kit_name})` : ""}`;

    // 1) Criar preferência de Checkout Pro
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${registrationId}-${Date.now()}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: String(registrationId),
            title: description,
            description,
            quantity: 1,
            currency_id: "BRL",
            unit_price: amount,
          },
        ],
        payer: {
          name: registration.participant_first_name || ((user as any).user_metadata)?.full_name?.split(" ")[0] || "Participante",
          surname: registration.participant_last_name || undefined,
          email: registration.participant_email || (user as any).email || undefined,
        },
        // external_reference = código de confirmação: permite ao webhook localizar a inscrição
        external_reference: registration.confirmation_code,
        // Webhook: atualização automática do status no banco
        notification_url: `${PROJECT_URL()}/functions/v1/mercadopago-webhook`,
        // Retorno do comprador para o site (confirmação em tela também é automática)
        back_urls: {
          success: `${appUrl}/pagamento/${registrationId}?status=approved`,
          failure: `${appUrl}/pagamento/${registrationId}?status=rejected`,
          pending: `${appUrl}/pagamento/${registrationId}?status=pending`,
        },
        auto_return: "approved",
        metadata: {
          registration_id: registrationId,
          race_id: registration.race_id,
        },
        expires: false,
      }),
    });

    if (!mpResponse.ok) {
      const errData = await mpResponse.json().catch(() => ({}));
      console.error("Mercado Pago preference error:", errData);
      throw new Error(`Falha ao criar checkout no Mercado Pago: ${errData?.message || mpResponse.statusText}`);
    }

    const preference = await mpResponse.json();

    // 2) Registrar o pagamento pendente no banco (coluna mp_init_point adicionada pelo SQL)
    const serviceFee = Math.round(amount * 0.05 * 100) / 100;
    const { data: paymentRecord, error: payErr } = await db
      .from("payments")
      .insert({
        registration_id: registrationId,
        method: "pix",
        amount: amount - serviceFee,
        service_fee: serviceFee,
        total: amount,
        status: "pending",
        pix_code: preference.init_point,
        transaction_id: `MP-CHECKOUT-${preference.id}`,
        mp_init_point: preference.init_point,
      })
      .select()
      .single();

    if (payErr) {
      console.error("Erro ao salvar pagamento:", payErr);
      throw new Error(`Erro ao registrar pagamento: ${payErr.message}`);
    }

    await db
      .from("registrations")
      .update({ payment_id: paymentRecord.id })
      .eq("id", registrationId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentRecord.id,
        initPoint: preference.init_point,
        checkoutUrl: preference.init_point || preference.checkout_redirect,
        amount,
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Create checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 400,
    });
  }
});
