// MERCADO PAGO WEBHOOK - versão corrigida
// Corrige: (1) tópico merchant_order era ignorado; (2) update + maybeSingle falhava
// quando havia mais de 1 payment por inscrição; (3) payment aprovado nunca era
// sobrescrito por "pending"; (4) valida valor pago.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getEnv = (...names: string[]): string => {
  for (const n of names) { const v = Deno.env.get(n); if (v) return v; }
  return "";
};
const PROJECT_URL = () => getEnv("PROJECT_URL", "SUPABASE_URL");
const SERVICE_ROLE_KEY = () => getEnv("SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

async function mpGet(path: string) {
  const token = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  return await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

function parseNotification(body: any, url: URL): { topic: string; id: string } | null {
  const topic = String(
    body?.type || body?.topic || url.searchParams.get("type") || url.searchParams.get("topic") || ""
  );
  const id = String(
    body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id") ||
    (typeof body?.resource === "string" ? body.resource.split("/").pop() : "") || ""
  );
  if (!topic || !id) return null;
  if (topic === "payment" || topic === "payments") return { topic: "payment", id };
  if (topic === "merchant_order") return { topic: "merchant_order", id };
  return null;
}

async function processPayment(supabase: any, mpPaymentId: string) {
  const res = await mpGet(`/v1/payments/${mpPaymentId}`);
  if (res.status === 404) return { ignored: "payment_not_found" };
  if (!res.ok) throw new Error(`Falha ao buscar pagamento no MP: HTTP ${res.status}`);
  const payment = await res.json();

  // Localiza a inscrição: external_reference = confirmation_code (fallback: metadata)
  const ref = payment.external_reference;
  let reg: any = null;
  if (ref) {
    const r = await supabase.from("registrations").select("id, status, price, confirmation_code")
      .eq("confirmation_code", ref).maybeSingle();
    reg = r.data;
  }
  if (!reg && payment.metadata?.registration_id) {
    const r = await supabase.from("registrations").select("id, status, price, confirmation_code")
      .eq("id", payment.metadata.registration_id).maybeSingle();
    reg = r.data;
  }
  if (!reg) return { ignored: "registration_not_found" };

  let newStatus: "approved" | "rejected" | "refunded" | "pending";
  switch (payment.status) {
    case "approved": newStatus = "approved"; break;
    case "refunded": newStatus = "refunded"; break;
    case "rejected": case "cancelled": case "charged_back": newStatus = "rejected"; break;
    default: newStatus = "pending";
  }

  // Segurança: valor pago precisa cobrir o preço da inscrição
  if (newStatus === "approved" && Number(reg.price) > 0 &&
      Number(payment.transaction_amount) + 0.01 < Number(reg.price)) {
    console.error("Valor divergente", payment.transaction_amount, reg.price);
    return { ignored: "amount_mismatch" };
  }

  // Escolhe a linha de payments: a que já tem esse id do MP, senão a mais recente
  let { data: row } = await supabase.from("payments").select("id, status")
    .eq("mercadopago_payment_id", String(mpPaymentId)).maybeSingle();
  if (!row) {
    const r = await supabase.from("payments").select("id, status")
      .eq("registration_id", reg.id).order("created_at", { ascending: false }).limit(1);
    row = r.data?.[0] ?? null;
  }

  const method = payment.payment_type_id === "credit_card" ? "credit_card"
    : payment.payment_type_id === "debit_card" ? "debit_card" : "pix";
  const paidAt = payment.date_approved || new Date().toISOString();

  if (!row) {
    const ins = await supabase.from("payments").insert({
      registration_id: reg.id, method, amount: payment.transaction_amount, service_fee: 0,
      total: payment.transaction_amount, status: newStatus,
      mercadopago_payment_id: String(mpPaymentId), transaction_id: `MP-${mpPaymentId}`,
      paid_at: newStatus === "approved" ? paidAt : null,
    }).select("id").single();
    if (ins.error) throw ins.error;
    row = ins.data;
  } else if (!(row.status === "approved" && newStatus === "pending")) {
    const upd = await supabase.from("payments").update({
      status: newStatus, method, mercadopago_payment_id: String(mpPaymentId),
      paid_at: newStatus === "approved" ? paidAt : null, updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (upd.error) throw upd.error;
  }

  if (newStatus === "approved") {
    await supabase.from("registrations").update({
      status: "confirmed", payment_id: row.id, updated_at: new Date().toISOString(),
    }).eq("id", reg.id);
  } else if (newStatus === "rejected" || newStatus === "refunded") {
    await supabase.from("registrations").update({
      status: "cancelled", updated_at: new Date().toISOString(),
    }).eq("id", reg.id).neq("status", "confirmed");
  }
  return { status: newStatus, registration: reg.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  try {
    const raw = await req.text();
    let body: any = {};
    try { body = JSON.parse(raw); } catch { /* IPN vem por query string */ }
    const url = new URL(req.url);
    console.log("Webhook:", raw, url.search);

    const n = parseNotification(body, url);
    if (!n) return json({ received: true, ignored: true });

    const supabase = createClient(PROJECT_URL(), SERVICE_ROLE_KEY());
    const results: unknown[] = [];

    if (n.topic === "payment") {
      results.push(await processPayment(supabase, n.id));
    } else {
      // merchant_order: lista os pagamentos do pedido e processa cada um
      const res = await mpGet(`/merchant_orders/${n.id}`);
      if (res.status === 404) return json({ received: true, ignored: "order_not_found" });
      if (!res.ok) throw new Error(`Falha ao buscar merchant_order: HTTP ${res.status}`);
      const order = await res.json();
      for (const p of order.payments ?? []) results.push(await processPayment(supabase, String(p.id)));
      if (!results.length) results.push({ ignored: "order_without_payments" });
    }
    return json({ received: true, results });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return json({ error: e.message }, 500); // 500 => MP reenvia
  }
});
