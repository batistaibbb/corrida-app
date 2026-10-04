// CONFIRM CHECKOUT PAYMENT - versão corrigida
// Corrige: o pagamento informado pelo navegador não era validado contra a inscrição
// (qualquer payment_id aprovado, de qualquer valor, confirmava qualquer inscrição).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getEnv = (...names: string[]): string => {
  for (const n of names) { const v = Deno.env.get(n); if (v) return v; }
  return "";
};
const PROJECT_URL = () => getEnv("PROJECT_URL", "SUPABASE_URL");
const SERVICE_ROLE_KEY = () => getEnv("SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-url, x-supabase-api-version, x-supabase-access-token, x-canonical-url, x-session-id",
});

serve(async (req) => {
  const cors = getCorsHeaders(req);
  const reply = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Max-Age": "86400" } });
  }

  try {
    const { registrationId, mpPaymentId } = await req.json();
    if (!registrationId || !mpPaymentId) throw new Error("registrationId e mpPaymentId obrigatórios");

    const admin = createClient(PROJECT_URL(), SERVICE_ROLE_KEY());

    const { data: registration } = await admin
      .from("registrations")
      .select("id, status, price, confirmation_code")
      .eq("id", registrationId)
      .maybeSingle();
    if (!registration) throw new Error("Inscrição não encontrada");

    if (registration.status === "confirmed") return reply({ success: true, alreadyConfirmed: true });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(mpPaymentId))}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!mpRes.ok) throw new Error(`Falha ao consultar pagamento no MP: HTTP ${mpRes.status}`);
    const payment = await mpRes.json();

    if (payment.status !== "approved") return reply({ success: false, mpStatus: payment.status });

    // O pagamento precisa pertencer a ESTA inscrição e cobrir o preço
    if (payment.external_reference !== registration.confirmation_code) {
      throw new Error("Pagamento não pertence a esta inscrição");
    }
    if (Number(registration.price) > 0 && Number(payment.transaction_amount) + 0.01 < Number(registration.price)) {
      throw new Error("Valor pago é menor que o valor da inscrição");
    }

    const paidAt = payment.date_approved || new Date().toISOString();
    const method = payment.payment_type_id === "credit_card" ? "credit_card"
      : payment.payment_type_id === "debit_card" ? "debit_card" : "pix";

    const { data: existingPay } = await admin
      .from("payments").select("id").eq("registration_id", registrationId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    let paymentRowId = existingPay?.id as string | undefined;
    if (existingPay) {
      await admin.from("payments").update({
        status: "approved", method, paid_at: paidAt,
        mercadopago_payment_id: String(mpPaymentId), updated_at: new Date().toISOString(),
      }).eq("id", existingPay.id);
    } else {
      const ins = await admin.from("payments").insert({
        registration_id: registrationId, method,
        amount: Number(payment.transaction_amount ?? 0), service_fee: 0,
        total: Number(payment.transaction_amount ?? 0), status: "approved",
        transaction_id: `MP-CHECKOUT-${mpPaymentId}`,
        mercadopago_payment_id: String(mpPaymentId), paid_at: paidAt,
      }).select("id").single();
      paymentRowId = ins.data?.id;
    }

    const { error: confErr } = await admin.from("registrations")
      .update({ status: "confirmed", payment_id: paymentRowId, updated_at: new Date().toISOString() })
      .eq("id", registrationId);
    if (confErr) throw confErr;

    return reply({ success: true, confirmed: true });
  } catch (error: any) {
    console.error("Confirm checkout error:", error);
    return reply({ error: error.message }, 400);
  }
});
