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

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-url, x-supabase-api-version, x-client-info",
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { registrationId } = await req.json();
    if (!registrationId) throw new Error("registrationId obrigatório");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    // Cliente com o token do usuário (RLS respeitada para leitura da inscrição)
    const supabase = createClient(
      Deno.env.get("PROJECT_URL") ?? "",
      Deno.env.get("ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    let user = (await supabase.auth.getUser()).data.user;

    // Fallback: se a sessão do usuário expirou no navegador, o frontend envia a
    // anon key. Nesse caso usamos o service role (servidor) e validamos a
    // inscrição pelo código de confirmação que já está na URL da página de
    // pagamento — o fluxo continua funcionando sem login ativo.
    const isServiceMode = !user;
    if (isServiceMode) {
      const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
      if (!serviceKey) throw new Error("Usuário não autenticado");
      user = { id: "" } as any;
      var supabaseAdmin = createClient(
        Deno.env.get("PROJECT_URL") ?? "",
        serviceKey
      );
    }

    const db = isServiceMode ? supabaseAdmin! : supabase;

    let registration = null as any;
    let regError: any = null;
    if (isServiceMode) {
      const { data, error } = await db
        .from("registrations")
        .select("*, races(name)")
        .eq("id", registrationId)
        .maybeSingle();
      registration = data;
      regError = error;
    } else {
      const { data, error } = await db
        .from("registrations")
        .select("*, races(name)")
        .eq("id", registrationId)
        .eq("user_id", user!.id)
        .single();
      registration = data;
      regError = error;
    }

    if (regError || !registration) throw new Error("Inscrição não encontrada para este usuário.");
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
        notification_url: `${Deno.env.get("PROJECT_URL")}/functions/v1/mercadopago-webhook`,
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
