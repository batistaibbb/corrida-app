// ============================================
// CREATE CARD PAYMENT - SUPABASE EDGE FUNCTION
// ============================================
// Deploy: supabase functions deploy create-card-payment
//
// Esta função cria um pagamento com cartão no Mercado Pago.
// IMPORTANTE: Em produção, os dados do cartão devem ser
// tokenizados pelo frontend usando o SDK do Mercado Pago.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-url, x-supabase-api-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registrationId, amount, description, token, installments, paymentMethodId } = await req.json();

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Not authenticated");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Get registration
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("*, races(name)")
      .eq("id", registrationId)
      .eq("user_id", user.id)
      .single();

    if (regError || !registration) {
      throw new Error("Registration not found");
    }

    // Create card payment in Mercado Pago
    const mercadopagoAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadopagoAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${registrationId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: description || `Inscrição - ${registration.races.name}`,
        payment_method_id: paymentMethodId || "pix", // Will be overridden by token
        token: token, // Tokenized card from frontend
        installments: installments || 1,
        payer: {
          email: user.email,
          first_name: user.user_metadata?.full_name?.split(" ")[0] || "Participante",
          last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "RunBrasil",
        },
        external_reference: registration.confirmation_code,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      }),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error("Mercado Pago error:", errorData);
      throw new Error(`Failed to create card payment: ${errorData.message}`);
    }

    const payment = await mpResponse.json();

    // Determine payment method
    const method = payment.payment_method_id === "debit_card" ? "debit_card" : "credit_card";

    // Create payment record in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        registration_id: registrationId,
        method: method,
        amount: amount * 0.95,
        service_fee: amount * 0.05,
        total: amount,
        status: payment.status === "approved" ? "approved" : "pending",
        mercadopago_payment_id: payment.id.toString(),
        transaction_id: `MP-CARD-${payment.id}`,
        paid_at: payment.status === "approved" ? payment.date_approved : null,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update registration
    if (payment.status === "approved") {
      await supabase
        .from("registrations")
        .update({ 
          status: "confirmed",
          payment_id: paymentRecord.id 
        })
        .eq("id", registrationId);
    } else {
      await supabase
        .from("registrations")
        .update({ payment_id: paymentRecord.id })
        .eq("id", registrationId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: paymentRecord.id,
          status: payment.status,
          status_detail: payment.status_detail,
          amount: amount,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Create card payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
