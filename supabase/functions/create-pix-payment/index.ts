// ============================================
// CREATE PIX PAYMENT - SUPABASE EDGE FUNCTION
// ============================================
// Deploy: supabase functions deploy create-pix-payment
//
// Esta função cria um pagamento PIX no Mercado Pago
// e retorna o QR Code e código copia-e-cola.

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
    const { registrationId, amount, description } = await req.json();

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

    // Create PIX payment in Mercado Pago
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
        payment_method_id: "pix",
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
      throw new Error(`Failed to create PIX payment: ${errorData.message}`);
    }

    const payment = await mpResponse.json();
    const pixData = payment.point_of_interaction?.transaction_data;

    if (!pixData) {
      throw new Error("PIX data not returned from Mercado Pago");
    }

    // Create payment record in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        registration_id: registrationId,
        method: "pix",
        amount: amount * 0.95, // Remove service fee
        service_fee: amount * 0.05,
        total: amount,
        status: "pending",
        pix_code: pixData.qr_code,
        pix_qr_code: pixData.qr_code_base64,
        mercadopago_payment_id: payment.id.toString(),
        transaction_id: `MP-PIX-${payment.id}`,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update registration with payment ID
    await supabase
      .from("registrations")
      .update({ payment_id: paymentRecord.id })
      .eq("id", registrationId);

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: paymentRecord.id,
          qr_code: pixData.qr_code,
          qr_code_base64: pixData.qr_code_base64,
          ticket_url: pixData.ticket_url,
          expiration_date: pixData.date_of_expiration,
          amount: amount,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Create PIX error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
