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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: MercadoPagoWebhook = await req.json();
    console.log("Webhook received:", body);

    // Only process payment notifications
    if (body.type !== "payment") {
      return new Response(JSON.stringify({ received: true }), {
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
    const paymentId = body.data.id;

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
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .select(`
        id,
        registration_id,
        registrations!inner (
          id,
          user_id,
          race_id,
          profiles!inner (
            id,
            email,
            name
          )
        )
      `)
      .eq("mercadopago_payment_id", paymentId)
      .single();

    if (paymentError || !paymentRecord) {
      console.error("Payment record not found:", paymentError);
      // Try to find by external_reference (confirmation code)
      const externalRef = payment.external_reference;
      if (externalRef) {
        const { data: regByCode } = await supabase
          .from("registrations")
          .select("id, user_id, race_id")
          .eq("confirmation_code", externalRef)
          .single();

        if (regByCode) {
          // Update payment with Mercado Pago ID
          await supabase
            .from("payments")
            .update({ mercadopago_payment_id: paymentId })
            .eq("registration_id", regByCode.id);
        }
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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

    // Update payment record
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        paid_at: paidAt,
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

    // If rejected, cancel the registration
    if (newStatus === "rejected") {
      await supabase
        .from("registrations")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentRecord.registration_id);
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
