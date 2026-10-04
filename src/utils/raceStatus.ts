import { Race } from '../types';
import { format, parseISO } from 'date-fns';

/**
 * Determina o status de inscrição baseado na data do evento
 */
export function getRegistrationStatus(race: Race): 'upcoming' | 'closed' | 'finished' {
  const now = new Date();
  const eventDate = new Date(race.date);
  
  // Se a data do evento já passou, está finalizado
  if (eventDate < now) {
    return 'finished';
  }
  
  // Se o evento está definido como fechado manualmente
  if (race.registrationStatus === 'closed') {
    return 'closed';
  }
  
  // Caso contrário, está com inscrições abertas
  return 'upcoming';
}

/**
 * Verifica se o evento está visível para o público
 */
export function isEventVisible(race: Race): boolean {
  return race.published;
}

/**
 * Verifica se é possível se inscrever no evento.
 * Auditoria UX P1: além de published/registrationStatus, bloqueia eventos com
 * data já passada — o status derivado (getRegistrationStatus) mostra "Encerrado",
 * mas sem este check o botão de inscrição continuava ativo via campo cru do banco.
 */
export function canRegister(race: Race): boolean {
  if (!race.published || race.registrationStatus !== 'upcoming') return false;
  const eventDate = new Date(race.date);
  if (!isNaN(eventDate.getTime()) && eventDate < new Date()) return false;
  return true;
}

/**
 * Retorna o texto do status de inscrição
 */
export function getRegistrationStatusText(status: 'upcoming' | 'closed' | 'finished'): string {
  switch (status) {
    case 'upcoming':
      return 'Inscrições Abertas';
    case 'closed':
      return 'Inscrições Encerradas';
    case 'finished':
      return 'Evento Encerrado';
  }
}

/**
 * Auditoria UX G1: data/hora legível e segura para exibição.
 * Evita crash de parseISO("") em telas críticas (Minhas Inscrições).
 */
export function formatEventDate(date?: string, time?: string): string {
  if (!date) return 'Data a confirmar';
  const d = parseISO(date);
  if (isNaN(d.getTime())) return 'Data a confirmar';
  const base = format(d, 'dd/MM/yyyy');
  return time ? `${base} às ${time}` : base;
}

/**
 * Auditoria UX G1: label amigável do status da INSCRIÇÃO (distinto do status do
 * EVENTO). "Em processamento" confundia o participante — na prática significa
 * que o pagamento foi aprovado e está sendo confirmado no sistema.
 */
export function getEnrollmentStatusLabel(reg: {
  status: string;
  paymentId?: string;
}): { text: string; hint?: string } {
  switch (reg.status) {
    case 'confirmed':
      return { text: '✅ Confirmado' };
    case 'pending_payment':
      return { text: '💳 Aguardando pagamento' };
    case 'cancelled':
      return { text: '❌ Cancelado' };
    default:
      // status desconhecido/'processing'
      return reg.paymentId
        ? { text: '🕓 Pagamento aprovado, confirmando inscrição…', hint: 'Se não atualizar em alguns minutos, fale com o organizador.' }
        : { text: '⏳ Em análise pelo organizador' };
  }
}


/**
 * Retorna a cor do status de inscrição
 */
export function getRegistrationStatusColor(status: 'upcoming' | 'closed' | 'finished'): string {
  switch (status) {
    case 'upcoming':
      return 'bg-emerald-500 text-white';
    case 'closed':
      return 'bg-slate-500 text-white';
    case 'finished':
      return 'bg-slate-700 text-white';
  }
}
