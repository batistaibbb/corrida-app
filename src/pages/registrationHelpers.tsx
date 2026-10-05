import { useState } from 'react';
import { Race, Registration } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Trophy, X, CheckCircle, Copy, Check, Download, AlertCircle } from 'lucide-react';
import { toSafeNumber, formatBRL } from '../utils/pricing';
import { formatEventDate } from '../utils/raceStatus';
import { showToast } from '../utils/toast';

export function getParticipantName(reg: Registration): string {
  const full = [reg.participantFirstName, reg.participantLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (full) return full;
  if (reg.userId === 'user-001') return 'João Pereira';
  if (reg.userId === 'user-002') return 'Maria Silva';
  return '-';
}

export function getParticipantPhone(reg: Registration): string {
  return reg.participantPhone || '-';
}

export function getParticipantEmail(reg: Registration): string {
  return reg.participantEmail || '-';
}

export function getParticipantCpf(reg: Registration): string {
  return reg.participantCpf || '-';
}

export function getKitLabel(reg: Registration): string {
  return reg.kitName || '-';
}

// Funções de Exportação
export function exportToPDF(registrations: Registration[], races: Race[]) {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('Relatório de Inscrições - Smart Brasil Ticket', 14, 22);
  
  // Data do relatório
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 30);
  
  // Total de inscrições
  doc.text(`Total de inscrições: ${registrations.length}`, 14, 36);
  
  // Tabela de inscrições (participante + kit para controle de distribuição)
  const tableData = registrations.map(reg => {
    const race = races.find(r => r.id === reg.raceId);
    return [
      reg.confirmationCode,
      getParticipantName(reg),
      getParticipantPhone(reg),
      getParticipantCpf(reg),
      race?.name || 'N/A',
      getKitLabel(reg),
      `${reg.distance}km`,
      reg.tshirtSize || 'N/A',
      reg.status === 'confirmed' ? 'Confirmado' : 'Pendente',
      format(parseISO(reg.createdAt), 'dd/MM/yyyy')
    ];
  });
  
  autoTable(doc, {
    head: [['Código', 'Participante', 'Telefone', 'CPF', 'Evento', 'Kit', 'Distância', 'Camisa', 'Status', 'Data']],
    body: tableData,
    startY: 42,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [16, 185, 129] }
  });
  
  // Salvar PDF
  doc.save(`inscricoes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportToExcel(registrations: Registration[], races: Race[]) {
  const data = registrations.map(reg => {
    const race = races.find(r => r.id === reg.raceId);
    return {
      'Código': reg.confirmationCode,
      'Participante': getParticipantName(reg),
      'Telefone': getParticipantPhone(reg),
      'E-mail': getParticipantEmail(reg),
      'CPF': getParticipantCpf(reg),
      'Data de Nascimento': reg.birthDate ? format(parseISO(reg.birthDate), 'dd/MM/yyyy') : '',
      'Sexo': reg.gender || '',
      'Endereço': [reg.address, reg.addressCity, reg.addressState, reg.zipCode].filter(Boolean).join(' - '),
      'Evento': race?.name || 'N/A',
      'Kit Escolhido': getKitLabel(reg),
      'Valor (R$)': toSafeNumber(reg.price),
      'Distância': `${reg.distance}km`,
      'Tamanho Camisa': reg.tshirtSize || 'N/A',
      'Status': reg.status === 'confirmed' ? 'Confirmado' : 'Pendente',
      'Data Inscrição': format(parseISO(reg.createdAt), 'dd/MM/yyyy'),
      'Contato Emergência': reg.emergencyName || 'N/A',
      'Telefone Emergência': reg.emergencyPhone || 'N/A',
      'Aceite dos Termos': reg.termsAcceptedAt ? format(parseISO(reg.termsAcceptedAt), 'dd/MM/yyyy HH:mm') : '',
      'Menor de idade': reg.isMinor ? 'Sim' : 'Não',
      'Responsável': reg.responsibleName || '',
      'CPF Responsável': reg.responsibleCpf || ''
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscrições');
  
  // Salvar Excel
  XLSX.writeFile(wb, `inscricoes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// Modal de Detalhes da Inscrição
export default function RegistrationDetailsModal({ registration, race, onClose }: { registration: Registration; race: Race | undefined; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Detalhes da Inscrição</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Código de Confirmação</p>
                <p className="font-mono font-semibold text-slate-900">{registration.confirmationCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${registration.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {registration.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                </span>
              </div>
            </div>
            
            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Evento</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="font-semibold text-slate-900">{race?.name || 'N/A'}</p>
                <p className="text-sm text-slate-600 mt-1">{formatEventDate(race?.date, race?.time)}</p>
                <p className="text-sm text-slate-600">{race?.location}, {race?.city}/{race?.state}</p>
              </div>
            </div>
            
            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Participante</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Nome</p>
                  <p className="font-semibold text-slate-900">{getParticipantName(registration)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="font-semibold text-slate-900">{getParticipantPhone(registration)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">E-mail</p>
                  <p className="font-semibold text-slate-900">{getParticipantEmail(registration)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CPF</p>
                  <p className="font-semibold text-slate-900">{getParticipantCpf(registration)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Data de nascimento</p>
                  <p className="font-semibold text-slate-900">{registration.birthDate ? format(parseISO(registration.birthDate), 'dd/MM/yyyy') : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sexo</p>
                  <p className="font-semibold text-slate-900">{registration.gender || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Endereço</p>
                  <p className="font-semibold text-slate-900">{[registration.address, registration.addressCity, registration.addressState, registration.zipCode].filter(Boolean).join(' - ') || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Aceite dos termos e declaração médica</p>
                  <p className="font-semibold text-slate-900">{registration.termsAcceptedAt ? format(parseISO(registration.termsAcceptedAt), 'dd/MM/yyyy HH:mm') : '-'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Inscrição</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Distância</p>
                  <p className="font-semibold text-slate-900">{registration.distance}km</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tamanho da Camisa</p>
                  <p className="font-semibold text-slate-900">{registration.tshirtSize || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Data da Inscrição</p>
                  <p className="font-semibold text-slate-900">{format(parseISO(registration.createdAt), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kit Selecionado</p>
                  <p className="font-semibold text-slate-900">{registration.kitName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Valor da Inscrição</p>
                  <p className="font-semibold text-slate-900">R$ {formatBRL(registration.price)}</p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Contato de Emergência</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Nome</p>
                  <p className="font-semibold text-slate-900">{registration.emergencyName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="font-semibold text-slate-900">{registration.emergencyPhone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-200 px-6 py-4 flex justify-end">
            <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
