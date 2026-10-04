// ============ HELPERS DE PREÇO (DEFENSIVOS) ============
// Fase 2 (Auditoria UX): extraídos de App.tsx para src/utils/pricing.ts.
// O Supabase pode retornar valores NUMERIC como string, null ou até colunas
// ausentes (ex.: "price" dentro do JSON de kits/distances quando o admin salvou
// sem preencher). Qualquer acesso direto a .toFixed() desses valores derruba o
// React e causa a temida tela em branco. Todos os renders de moeda passam por
// estes helpers, que SEMPRE devolvem um número seguro.

export const toSafeNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Menor preço entre distâncias E kits — usado nos cards/listas onde antes só
// existia Math.min(...distances.map(d => d.price)), que quebrava com price null.
export const getLowestPrice = (race?: { distances?: any[]; kits?: any[] } | null): number => {
  if (!race) return 0;
  const prices = [
    ...(race.distances || []).map((d: any) => toSafeNumber(d?.price)),
    ...(race.kits || []).map((k: any) => toSafeNumber(k?.price)),
  ].filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : 0;
};

// Preço efetivo de uma distância/kit já aplicando o desconto do evento.
export const discounted = (price: any, discount?: number) =>
  toSafeNumber(price) * (1 - toSafeNumber(discount) / 100);

export const formatBRL = (value: any): string =>
  toSafeNumber(value).toFixed(2).replace('.', ',');
