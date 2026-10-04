// CREATE CHECKOUT PAYMENT (MERCADO PAGO) - versão corrigida
// Corrige: (1) permitia criar novo checkout/pagamento para inscrição JÁ CONFIRMADA
// (cobrança duplicada); (2) quebrava com TypeError quando não havia usuário logado
// e faltava nome/e-mail do participante.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MP_ACCESS_TOKEN, PROJECT_URL, ANON_KEY, SERVICE_ROLE_KEY } from "../_shared/env.ts";
import { getCorsHeaders as baseCorsHeaders, corsResponse } from "../_shared/cors.ts";

// This function is invoked with the Supabase access token in a custom header
// (x-supabase-access-token), so it needs that extra allowed header on top of
// the shared CORS defaults.
const getCorsHeaders = (req: Request) => ({
  ...baseCorsHeaders(req),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-url, x-supabase-api-version, x-supabase-access-token, x-canonical-url, x-session-id",
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return corsResponse(corsHeaders);
  }

  try {
    const { registrationId } = await req.json().catch(() => ({}));
    if (!registrationId) throw new Error("registrationId obrigatório");

    const authHeader = req.headers.get("Authorization");

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

    // NOVO: não gera novo checkout para inscrição já paga (evita cobrança duplicada)
    if (registration.status === "confirmed") {
      throw new Error("Esta inscrição já está paga e confirmada. Nenhum novo pagamento é necessário.");
    }

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

    const accessToken = MP_ACCESS_TOKEN();

    const eventName = registration.races?.name || "Inscrição Smart Brasil Ticket";
    const description = `Inscrição - ${eventName}${registration.kit_name ? ` (${registration.kit_name})` : ""}`;

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
          name: registration.participant_first_name || user?.user_metadata?.full_name?.split(" ")[0] || "Participante",
          surname: registration.participant_last_name || undefined,
          email: registration.participant_email || user?.email || undefined,
        },
        external_reference: registration.confirmation_code,
        notification_url: `${PROJECT_URL()}/functions/v1/mercadopago-webhook`,
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
