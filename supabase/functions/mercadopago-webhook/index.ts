// ============================================
// MERCADO PAGO WEBHOOK - SUPABASE EDGE FUNCTION
// ============================================
// Deploy: supabase functions deploy mercadopago-webhook
// 
// Esta função recebe notificações do Mercado Pago
// quando um pagamento é aprovado/rejeitado e atualiza
// automaticamente o status da inscrição.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-url, x-supabase-api-version",
};

interface MercadoPagoWebhook {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: string;
  live_mode: boolean;
  type: string;
  user_id: string;
}

// Normaliza o ID do pagamento a partir dos vários formatos que o Mercado Pago
// envia (webhook clássico, x-format v3.1 com topic/resource, query params de
// notificações antigas tipo ?type=payment&data.id=...).
function extractPaymentId(body: any, url: URL): string | null {
  const topic = body?.type || body?.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  const resourceId =
    body?.data?.id ||
    body?.resource ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("id");
  // Só processamos tópicos de pagamento (checkout pro também usa "payment")
  if (topic && !String(topic).includes("payment")) return null;
  if (!resourceId) return null;
  // Tópicos como merchant_order podem não ser payment id — ignoramos por segurança
  if (topic && topic !== "payment" && topic !== "payments") return null;
  return String(resourceId);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let body: any = {};
    try { body = JSON.parse(rawBody); } catch { /* corpo pode vir vazio em notificações por query string */ }
    console.log("Webhook received:", body, req.url);

    const url = new URL(req.url);
    const paymentId = extractPaymentId(body, url);
    if (!paymentId) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get payment details from Mercado Pago API
    const mercadopagoAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mercadopagoAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!mpResponse.ok) {
      throw new Error(`Failed to fetch payment: ${mpResponse.statusText}`);
    }

    const payment = await mpResponse.json();
    console.log("Payment details:", payment);

    // Find payment record by Mercado Pago payment ID
    let { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .select(`
        id,
        registration_id,
        registrations!inner (
          id,
          user_id,
          race_id
        )
      `)
      .eq("mercadopago_payment_id", paymentId)
      .maybeSingle();

    if (paymentError || !paymentRecord) {
      console.warn("Payment record not found by MP id:", paymentError);
      // Fallback 1: localizar a inscrição pelo external_reference (código de confirmação)
      const externalRef = payment.external_reference;
      if (externalRef) {
        const { data: regByCode } = await supabase
          .from("registrations")
          .select("id, user_id, race_id")
          .eq("confirmation_code", externalRef)
          .maybeSingle();

        if (regByCode) {
          // Atualiza o pagamento existente com o ID do MP e segue o fluxo normal
          const { data: updated } = await supabase
            .from("payments")
            .update({ mercadopago_payment_id: paymentId })
            .eq("registration_id", regByCode.id)
            .select("id, registration_id")
            .maybeSingle();
          if (updated) paymentRecord = updated;
        }
      }

      // Fallback 2: localizar pelo ID da inscrição enviado como item.id na preferência
      if (!paymentRecord) {
        const itemId = payment?.items?.[0]?.id || payment?.additional_info?.items?.[0]?.id;
        if (itemId && /^[0-9a-fA-F-]{36}$/.test(itemId)) {
          const { data: updated } = await supabase
            .from("payments")
            .update({ mercadopago_payment_id: paymentId })
            .eq("registration_id", itemId)
            .select("id, registration_id")
            .maybeSingle();
          if (updated) paymentRecord = updated;
        }
      }

      if (!paymentRecord) {
        return new Response(JSON.stringify({ received: true, unmatched: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Update payment status based on Mercado Pago status
    let newStatus: string;
    let paidAt: string | null = null;

    switch (payment.status) {
      case "approved":
        newStatus = "approved";
        paidAt = payment.date_approved || new Date().toISOString();
        break;
      case "rejected":
      case "cancelled":
      case "refunded":
      case "charged_back":
        newStatus = payment.status === "refunded" ? "refunded" : "rejected";
        break;
      case "pending":
      case "in_process":
      case "authorized":
        newStatus = "pending";
        break;
      default:
        newStatus = "pending";
    }

    // Update payment record (inclui o ID real do MP para rastreabilidade)
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        paid_at: paidAt,
        mercadopago_payment_id: String(paymentId),
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRecord.id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw updateError;
    }

    // If approved, confirm the registration
    if (newStatus === "approved") {
      const { error: regError } = await supabase
        .from("registrations")
        .update({
          status: "confirmed",
          payment_id: paymentRecord.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentRecord.registration_id);

      if (regError) {
        console.error("Error updating registration:", regError);
      }

      // TODO: Send confirmation email via Supabase Edge Function or external service
      // await sendConfirmationEmail(paymentRecord.registrations.profiles.email, ...);
    }

    // Se rejeitado/cancelado/expirado, marca a inscrição como cancelada.
    // Pagamentos pendentes (ex.: PIX aguardando) NÃO alteram a inscrição.
    if (newStatus === "rejected" || newStatus === "refunded") {
      await supabase
        .from("registrations")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentRecord.registration_id)
        .neq("status", "confirmed");
    }

    return new Response(JSON.stringify({ received: true, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
