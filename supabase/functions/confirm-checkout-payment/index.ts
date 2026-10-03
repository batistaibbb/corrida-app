// ============================================
// CONFIRM CHECKOUT PAYMENT - SUPABASE EDGE FUNCTION
// ============================================
// Deploy: supabase functions deploy confirm-checkout-payment
//
// Chamada pelo frontend quando o usuário VOLTA do checkout do Mercado Pago
// com ?status=approved. Confirma o pagamento direto na API do MP (fonte da
// verdade) e atualiza payments + registrations no banco — sem depender de o
// webhook já ter chegado. Idempotente: se o webhook já confirmou, não faz nada.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-url, x-supabase-api-version",
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { registrationId, mpPaymentId } = await req.json();
    if (!registrationId || !mpPaymentId) throw new Error("registrationId e mpPaymentId obrigatórios");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Confirma que a inscrição pertence ao usuário
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("id, status, payment_id")
      .eq("id", registrationId)
      .eq("user_id", user.id)
      .single();
    if (regError || !registration) throw new Error("Inscrição não encontrada");

    // Já confirmada (webhook chegou antes) -> idempotente
    if (registration.status === "confirmed") {
      return new Response(JSON.stringify({ success: true, alreadyConfirmed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consulta o pagamento na API do Mercado Pago (fonte da verdade)
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!mpRes.ok) throw new Error(`Falha ao consultar pagamento no MP: HTTP ${mpRes.status}`);
    const payment = await mpRes.json();

    if (payment.status !== "approved") {
      return new Response(JSON.stringify({ success: false, mpStatus: payment.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Client com service role para garantir o update mesmo com RLS restritiva
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const paidAt = payment.date_approved || new Date().toISOString();

    // Atualiza/cria o registro de pagamento
    const { data: existingPay } = await admin
      .from("payments")
      .select("id")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPay) {
      await admin
        .from("payments")
        .update({
          status: "approved",
          paid_at: paidAt,
          mercadopago_payment_id: String(mpPaymentId),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPay.id);
    } else {
      await admin.from("payments").insert({
        registration_id: registrationId,
        method: "pix",
        amount: Number(payment.transaction_amount ?? 0),
        service_fee: 0,
        total: Number(payment.transaction_amount ?? 0),
        status: "approved",
        transaction_id: `MP-CHECKOUT-${mpPaymentId}`,
        mercadopago_payment_id: String(mpPaymentId),
        paid_at: paidAt,
      });
    }

    // Confirma a inscrição
    const { error: confErr } = await admin
      .from("registrations")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", registrationId);
    if (confErr) throw confErr;

    return new Response(JSON.stringify({ success: true, confirmed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Confirm checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
