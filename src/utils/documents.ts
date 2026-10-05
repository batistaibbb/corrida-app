// Utilitários compartilhados de CPF, telefone e WhatsApp.
// Centralizados aqui para manter a mesma regra (máscaras e validação) em
// cadastro (login), inscrição, formulário do admin e botão de contato.

/** Mantém apenas dígitos e limita a 11 caracteres. */
export function onlyCpfDigits(value: string): string {
  return (value || '').replace(/\D/g, '').slice(0, 11);
}

/** Máscara progressiva 000.000.000-00 enquanto digita. */
export function maskCpf(value: string): string {
  const d = onlyCpfDigits(value);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Validação real de CPF (dígitos verificadores). Aceita com ou sem máscara. */
export function isValidCpf(raw: string): boolean {
  const cpf = onlyCpfDigits(raw);
  if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (11 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

/**
 * Validação "leve" de CPF para telas onde o campo é OPCIONAL (ex.: cadastro).
 * Vazio -> válido (não bloqueia); preenchido -> precisa ser um CPF real.
 * Inclui uma exceção explícita para sequências de teste muito comuns
 * (123.456.789-00 etc.), que passam no algoritmo mas não existem na Receita.
 */
export function isOptionalCpfValid(raw: string): boolean {
  const digits = onlyCpfDigits(raw);
  if (!digits) return true;
  if (/^(12345678901|12345678900|11122233344|12345098320)$/.test(digits)) return false;
  return isValidCpf(digits);
}

/** Máscara progressiva de telefone celular: (11) 99999-9999 / fixo (11) 9999-9999. */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Máscara progressiva de CEP: 00000-000. */
export function maskZip(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Converte um número digitado pelo admin em formato internacional para wa.me.
 * Regras: remove tudo que não for dígito; números com 10-11 dígitos são
 * assumidos como Brasil (DDI 55); abaixo disso não gera link confiável.
 */
export function whatsappLink(rawNumber: string | undefined | null, message?: string): string | null {
  if (!rawNumber) return null;
  let digits = rawNumber.replace(/\D/g, '');
  if (!digits) return null;
  // já vem com DDI (ex.: 5511999998888 -> 12/13 dígitos começando com 55)
  const hasCountryCode = digits.length >= 12 && digits.startsWith('55');
  if (!hasCountryCode) {
    if (digits.length < 10) return null; // incompleto — não mostra o botão
    digits = `55${digits}`;
  }
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
