import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { Race, Registration, Payment } from '../types';
import { supabase, isDemoMode, supabaseUrlSafe, supabaseAnonKeySafe } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getRegistrationStatus, getRegistrationStatusText, getRegistrationStatusColor, canRegister, formatEventDate, getEnrollmentStatusLabel } from '../utils/raceStatus';
import { showToast } from '../utils/toast';
import { confirmAction } from '../utils/confirm';
import { setEventShareMeta, resetShareMeta } from '../utils/shareMeta';
import { toSafeNumber, getLowestPrice, discounted, formatBRL } from '../utils/pricing';
import { safeRedirectTarget } from '../components/ProtectedRoute';
import { ArrowLeft } from 'lucide-react';

export default function RegistrationPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams(); // G5: ?continuar=1 retoma inscrição pendente
  const { user } = useAuth();
  const { getRaceById, addRegistration, registrations } = useData();
  const navigate = useNavigate();
  const race = id ? getRaceById(id) : null;
  const [step, setStep] = useState(1);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [formData, setFormData] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', cpf: '', birthDate: '', gender: '', 
    tshirtSize: '', address: '', city: '', state: '', zipCode: '', 
    emergencyName: '', emergencyPhone: '', acceptTerms: false, acceptMedical: false,
    responsibleName: '', responsibleCpf: '' 
  });

  // Auditoria UX P8: pre-preencher dados pessoais a partir do perfil - hoje o
  // usuario logado digita tudo de novo mesmo tendo nome/email/CPF/telefone salvos.
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || (user.name || '').split(' ')[0] || '',
        lastName: prev.lastName || (user.name || '').split(' ').slice(1).join(' ') || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        cpf: prev.cpf || user.cpf || '',
      }));
    }
  }, [user]);

  // Auditoria UX P2: deslogado aqui (link direto/refresh) -> login com retorno garantido.
  if (!race || !user) {
    if (!user) return <Navigate to={`/login?from=${encodeURIComponent(`/inscricao/${id || ''}`)}`} replace />;
    return <div className="text-center py-20">Dados inválidos</div>;
  }

  // Auditoria UX G5: se já existe inscrição pendente de pagamento neste evento,
  // retoma direto o pagamento em vez de criar uma inscrição duplicada.
  useEffect(() => {
    if (!user || !race || !registrations.length) return;
    const pend = registrations.find(
      r => r.userId === user.id && r.raceId === race.id && r.status === 'pending_payment'
    );
    if (pend) navigate(`/pagamento/${pend.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, race?.id, registrations]);

  // Auditoria UX P7: mascaras progressivas enquanto digita.
  const maskCpf = (v: string) => v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  const maskZip = (v: string) => v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let next = value;
    if (name === 'cpf' || name === 'responsibleCpf') next = maskCpf(value);
    else if (name === 'phone' || name === 'emergencyPhone') next = maskPhone(value);
    else if (name === 'zipCode') next = maskZip(value);
    else if (name === 'state') next = value.toUpperCase().slice(0, 2);
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : next }));
  };

  const getSelectedKit = () => {
    return race.kits?.find(k => k.id === selectedKit);
  };

  // Auditoria UX P3: validacao real de CPF (digitos verificadores).
  const isValidCpf = (raw: string) => {
    const cpf = raw.replace(/\D/g, '');
    if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (11 - i);
    let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0;
    if (d1 !== parseInt(cpf[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (10 - i);
    let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0;
    return d2 === parseInt(cpf[10]);
  };

  // Menor de idade: exige responsavel legal (nome + CPF valido do responsavel).
  const parseResponsibleCpf = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null; // campo opcional quando maior de idade
    if (!isValidCpf(digits)) return undefined; // invalido -> bloqueia envio
    return digits;
  };

  const ageFromBirthDate = (birthDate: string) => {
    const b = new Date(birthDate);
    if (isNaN(b.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  };

  const isMinor = (() => {
    if (!formData.birthDate) return false;
    const age = ageFromBirthDate(formData.birthDate);
    return age !== null && age < 18;
  })();

  const handleSubmit = async () => {
    const kit = getSelectedKit();
    // Validação explícita: sem preço numérico válido a tela de pagamento quebraria
    if (!kit || !Number.isFinite(Number(kit.price)) || Number(kit.price) <= 0) {
      showToast('O preço do kit selecionado é inválido. Edite o evento no painel admin e defina um preço (número maior que zero).', 'error', 6000);
      return;
    }
    // P3: bloquear envio com dados invalidos ANTES de criar a inscricao pendente
    if (!isValidCpf(formData.cpf)) { showToast('CPF inválido. Verifique os números informados.', 'error'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) { showToast('E-mail inválido.', 'error'); return; }
    if (formData.phone.replace(/\D/g, '').length < 10) { showToast('Telefone incompleto — inclua DDD.', 'error'); return; }
    if (formData.birthDate && new Date(formData.birthDate) > new Date()) { showToast('Data de nascimento não pode ser no futuro.', 'error'); return; }
    // Menor de idade: exigir responsavel legal com CPF valido.
    if (isMinor) {
      if (!formData.responsibleName?.trim()) { showToast('Para menores de 18 anos é obrigatório o nome do responsável legal.', 'error'); return; }
      const respCpf = parseResponsibleCpf(formData.responsibleCpf || '');
      if (respCpf === undefined) { showToast('CPF do responsável inválido. Verifique os números informados.', 'error'); return; }
      if (respCpf === null) { showToast('Para menores de 18 anos é obrigatório o CPF do responsável legal.', 'error'); return; }
    }
    try {
      const regId = await addRegistration({
        userId: user.id,
        raceId: race.id,
        distance: kit?.distance || 0,
        tshirtSize: formData.tshirtSize,
        kitId: selectedKit,
        kitName: kit?.name,
        // Auditoria UX P5: persistir o preço COM o desconto do evento aplicado —
        // é este valor que a tela de pagamento e o checkout do MP vão cobrar.
        price: discounted(Number(kit.price), race.discount),
        status: 'pending_payment',
        emergencyName: formData.emergencyName,
        emergencyPhone: formData.emergencyPhone,
        // Dados do participante persistidos na inscrição (relatório admin)
        participantFirstName: formData.firstName,
        participantLastName: formData.lastName,
        participantEmail: formData.email,
        participantPhone: formData.phone,
        participantCpf: formData.cpf,
        birthDate: formData.birthDate || undefined,
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        addressCity: formData.city || undefined,
        addressState: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        termsAcceptedAt: formData.acceptTerms ? new Date().toISOString() : undefined,
        medicalDeclarationAt: formData.acceptMedical ? new Date().toISOString() : undefined,
        // Menor de idade: responsavel legal coletado no checkout
        ...(isMinor ? {
          isMinor: true,
          responsibleName: formData.responsibleName.trim(),
          responsibleCpf: (formData.responsibleCpf || '').replace(/\D/g, ''),
        } : {}),
      });
      if (!regId) throw new Error('Inscrição não retornou ID');
      navigate(`/pagamento/${regId}`);
    } catch (error) {
      console.error('Erro ao criar inscrição:', error);
      showToast(`Erro ao criar inscrição: ${error instanceof Error ? error.message : 'tente novamente'}.`, 'error', 6000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="font-bold">Inscrição - {race.name}</h1><p className="text-sm text-gray-500">Passo {step} de 4</p></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Escolha seu Kit</h2>
                {race.kits && race.kits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {race.kits.map(kit => (
                      <button
                        key={kit.id}
                        onClick={() => setSelectedKit(kit.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedKit === kit.id 
                            ? 'border-emerald-500 bg-emerald-50' 
                            : 'border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <img src={kit.image} alt={kit.name} className="w-full h-40 object-cover rounded-lg mb-3" />
                        <h3 className="font-bold text-slate-900 mb-1">{kit.name}</h3>
                        <p className="text-sm text-slate-600 mb-2">{kit.description}</p>
                        <ul className="text-xs text-slate-500 mb-3 space-y-1">
                          {kit.includes.map((item, i) => (
                            <li key={i}>✓ {item}</li>
                          ))}
                        </ul>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold text-emerald-600">
                            {(race.discount ?? 0) > 0 && (
                              <span className="text-sm font-normal text-slate-400 line-through mr-2">R$ {formatBRL(toSafeNumber(kit.price))}</span>
                            )}
                            R$ {formatBRL(discounted(toSafeNumber(kit.price), race.discount))}
                          </span>
                          {kit.distance && kit.distance > 0 && (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                              {kit.distance}km
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500">Nenhum kit disponível para este evento</p>
                  </div>
                )}
                <button 
                  onClick={() => setStep(2)} 
                  disabled={!selectedKit} 
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Dados Pessoais</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Nome" className="px-4 py-2.5 border rounded-lg" required />
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Sobrenome" className="px-4 py-2.5 border rounded-lg" required />
                </div>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-mail" className="w-full px-4 py-2.5 border rounded-lg" required />
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" className="w-full px-4 py-2.5 border rounded-lg" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="CPF *" className="px-4 py-2.5 border rounded-lg" required />
                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="px-4 py-2.5 border rounded-lg" required />
                </div>
                {/* Auditoria UX P1/menores: data de nascimento obrigatoria para identificar menor de 18 */}
                {!formData.birthDate && (
                  <p className="text-xs text-slate-500 -mt-2">Informe a data de nascimento — obrigatória para validar regras de participação de menores de 18 anos.</p>
                )}
                {isMinor && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                    <p className="text-sm font-bold text-amber-800">⚠️ Participante menor de 18 anos</p>
                    <p className="text-xs text-amber-700">É necessário o consentimento do responsável legal, com nome e CPF válidos.</p>
                    <input type="text" name="responsibleName" value={formData.responsibleName} onChange={handleChange} placeholder="Nome completo do responsável legal *" className="w-full px-4 py-2.5 border rounded-lg bg-white" />
                    <input type="text" name="responsibleCpf" value={formData.responsibleCpf} onChange={handleChange} placeholder="CPF do responsável * " className="w-full px-4 py-2.5 border rounded-lg bg-white" inputMode="numeric" />
                  </div>
                )}
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg" required>
                  <option value="">Gênero</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="px-6 py-3 border rounded-xl">Voltar</button>
                  <button onClick={() => setStep(3)} disabled={!formData.firstName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email) || formData.cpf.replace(/\D/g, '').length !== 11 || !formData.birthDate || (isMinor && (!formData.responsibleName.trim() || !formData.responsibleCpf.replace(/\D/g, '')))} className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50">Próximo</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Tamanho e Endereço</h2>
                
                {/* Tamanho da Camisa - apenas se o kit incluir camisa */}
                {getSelectedKit()?.includes.some(item => item.toLowerCase().includes('camisa')) && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Tamanho da Camiseta *</label>
                    <div className="flex flex-wrap gap-2">
                      {(race.shirtSizes || ['PP', 'P', 'M', 'G', 'GG', 'XGG']).map(size => (
                        <button 
                          key={size} 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, tshirtSize: size }))} 
                          className={`px-4 py-2 rounded-lg border-2 ${
                            formData.tshirtSize === size 
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                              : 'border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Endereço" className="w-full px-4 py-2.5 border rounded-lg" required />
                <div className="grid grid-cols-3 gap-4">
                  <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Cidade" className="px-4 py-2.5 border rounded-lg" required />
                  <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="UF" maxLength={2} className="px-4 py-2.5 border rounded-lg" required />
                  <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="CEP" className="px-4 py-2.5 border rounded-lg" required />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="px-6 py-3 border rounded-xl">Voltar</button>
                  <button 
                    onClick={() => setStep(4)} 
                    disabled={
                      (getSelectedKit()?.includes.some(item => item.toLowerCase().includes('camisa')) && !formData.tshirtSize) || 
                      !formData.address
                    } 
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Emergência e Termos</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleChange} placeholder="Contato de emergência" className="px-4 py-2.5 border rounded-lg" required />
                  <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} placeholder="Telefone emergência" className="px-4 py-2.5 border rounded-lg" required />
                </div>
                <label className="flex items-start gap-2"><input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} className="mt-1" /><span className="text-sm">Li e aceito os termos de uso *</span></label>
                <label className="flex items-start gap-2"><input type="checkbox" name="acceptMedical" checked={formData.acceptMedical} onChange={handleChange} className="mt-1" /><span className="text-sm">Declaro que possuo atestado médico *</span></label>
                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="px-6 py-3 border rounded-xl">Voltar</button>
                  <button onClick={handleSubmit} disabled={!formData.emergencyName || !formData.acceptTerms || !formData.acceptMedical} className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50">Finalizar Inscrição</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm h-fit sticky top-20">
            <h3 className="font-bold mb-4">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Evento</span><span className="font-medium">{race.name}</span></div>
              {selectedKit && getSelectedKit() && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Kit</span><span className="font-medium">{getSelectedKit()?.name}</span></div>
                  {getSelectedKit()?.distance && getSelectedKit()?.distance! > 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">Distância</span><span className="font-medium">{getSelectedKit()?.distance} km</span></div>
                  )}
                  {formData.tshirtSize && (
                    <div className="flex justify-between"><span className="text-gray-500">Camisa</span><span className="font-medium">Tam. {formData.tshirtSize}</span></div>
                  )}
                  {(race.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>Desconto do evento ({race.discount}%)</span>
                      <span>- R$ {formatBRL(toSafeNumber(getSelectedKit()?.price) - discounted(toSafeNumber(getSelectedKit()?.price), race.discount))}</span>
                    </div>
                  )}
                  {/* P5: total exibido = preco cobrado (com desconto), igual ao persistido na inscricao */}
                  <div className="flex justify-between pt-3 border-t"><span className="font-bold">Total</span><span className="font-bold text-emerald-600">R$ {formatBRL(discounted(toSafeNumber(getSelectedKit()?.price), race.discount))}</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
