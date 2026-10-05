import { useState } from 'react';
import { X, Save, Image as ImageIcon, FileText, Eye, Plus, GripVertical, Trash2, MessageCircle } from 'lucide-react';
import ImageUpload from './ImageUpload';
import PdfUpload from './PdfUpload';
import EventPreview from './EventPreview';
import DragDropList from './DragDropList';
import { Race, RaceKit, RaceDistance } from '../types';

interface EventFormProps {
  race?: Race | null;
  onSave: (data: any) => void;
  onClose: () => void;
  organizerId: string;
  organizerName: string;
}

type FormStep = 'basic' | 'details' | 'distances' | 'kits' | 'publish';

export default function EventForm({ race, onSave, onClose, organizerId, organizerName }: EventFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    name: race?.name || '',
    date: race?.date || '',
    time: race?.time || '',
    location: race?.location || '',
    city: race?.city || '',
    state: race?.state || '',
    // Auditoria UX P6: infos de retirada do kit (exibidas no comprovante/QR do participante)
    kitPickup: race?.kitPickup || '',
    kitPickupLocation: race?.kitPickupLocation || '',
    // WhatsApp do organizador (botão de contato na página pública do evento)
    organizerWhatsapp: race?.organizerWhatsapp || '',
    image: race?.image || '',
    description: race?.description || '',
    // Ao editar, mantém o organizador do evento; só usa o nome do usuário logado em eventos novos
    organizer: race?.organizer || organizerName,
    organizerId: race?.organizerId || organizerId,
    maxParticipants: race?.maxParticipants || 1000,
    category: race?.category || 'Corrida',
    sport: race?.sport || 'corrida',
    published: race?.published ?? false,
    registrationStatus: race?.registrationStatus || 'upcoming',
    includes: race?.includes || [''],
    rules: race?.rules || [''],
    featured: race?.featured || false,
    discount: race?.discount || 0,
    tags: race?.tags || [''],
    distances: race?.distances || [],
    kits: race?.kits || [],
    shirtSizes: race?.shirtSizes || ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
    regulationPdf: race?.regulationPdf || '',
    routeMap: race?.routeMap || '',
  });

  const steps: { id: FormStep; label: string; icon: any }[] = [
    { id: 'basic', label: 'Básico', icon: ImageIcon },
    { id: 'details', label: 'Detalhes', icon: FileText },
    { id: 'distances', label: 'Distâncias', icon: GripVertical },
    { id: 'kits', label: 'Kits', icon: ImageIcon },
    { id: 'publish', label: 'Publicar', icon: Eye },
  ];

  const handleAddDistance = () => {
    const newDistance: RaceDistance = {
      km: 5,
      price: 100,
      name: '',
      description: '',
    };
    setFormData({ ...formData, distances: [...formData.distances, newDistance] });
  };

  const handleUpdateDistance = (index: number, field: keyof RaceDistance, value: any) => {
    const newDistances = [...formData.distances];
    newDistances[index] = { ...newDistances[index], [field]: value };
    setFormData({ ...formData, distances: newDistances });
  };

  const handleRemoveDistance = (index: number) => {
    setFormData({ ...formData, distances: formData.distances.filter((_, i) => i !== index) });
  };

  const handleAddKit = () => {
    const newKit: RaceKit = {
      id: `kit-${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      image: '',
      includes: [],
      distance: 0,
    };
    setFormData({ ...formData, kits: [...formData.kits, newKit] });
  };

  const handleUpdateKit = (index: number, field: keyof RaceKit, value: any) => {
    const newKits = [...formData.kits];
    newKits[index] = { ...newKits[index], [field]: value };
    setFormData({ ...formData, kits: newKits });
  };

  const handleRemoveKit = (index: number) => {
    setFormData({ ...formData, kits: formData.kits.filter((_, i) => i !== index) });
  };

  // Máscara progressiva de telefone/WhatsApp enquanto digita.
  const maskPhoneField = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 13);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  };

  const handleSubmit = () => {
    onSave({
      ...formData,
      includes: formData.includes.filter(i => i.trim()),
      rules: formData.rules.filter(r => r.trim()),
      tags: formData.tags.filter(t => t.trim()),
      // Persiste somente dígitos (padrão usado para montar o link wa.me)
      organizerWhatsapp: formData.organizerWhatsapp.replace(/\D/g, ''),
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'basic':
        return formData.name && formData.date && formData.time && formData.location && formData.city && formData.state && formData.image;
      case 'details':
        return formData.description && formData.maxParticipants > 0;
      case 'distances':
        return formData.distances.length > 0 && formData.distances.every(d => d.km > 0 && (d.price > 0 || formData.kits.length > 0));
      case 'kits':
        return formData.kits.length === 0 || formData.kits.every(k => k.name && k.price > 0 && k.image);
      case 'publish':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div className="min-h-screen flex items-start justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8">
          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {race ? 'Editar Evento' : 'Criar Novo Evento'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Passo {steps.findIndex(s => s.id === currentStep) + 1} de {steps.length}: {steps.find(s => s.id === currentStep)?.label}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="border-b border-slate-200 px-6 py-3">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : isCompleted
                        ? 'bg-slate-100 text-slate-700'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <step.icon className="w-4 h-4" />
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex">
            {/* Form */}
            <div className={`flex-1 p-6 ${showPreview ? 'border-r border-slate-200' : ''}`}>
              {/* Step 1: Basic Info */}
              {currentStep === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome do Evento *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: 1ª Corrida e Caminhada Mulheres em Movimento"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Data *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Horário *
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Local *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ex: Ciclovia - Saída Bosque de Nova Campinas"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Ex: Campinas"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Estado *
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        placeholder="Ex: SP"
                        maxLength={2}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <ImageUpload
                    value={formData.image}
                    onChange={(url) => setFormData({ ...formData, image: url })}
                    label="Imagem Principal do Evento *"
                    recommendedWidth={1200}
                    recommendedHeight={630}
                    aspectRatio="16:9"
                  />
                </div>
              )}

              {/* Step 2: Details */}
              {currentStep === 'details' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Descrição *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o evento em detalhes..."
                      rows={6}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Categoria
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="Corrida">Corrida</option>
                        <option value="Caminhada">Caminhada</option>
                        <option value="Corrida e Caminhada">Corrida e Caminhada</option>
                        <option value="Trail Run">Trail Run</option>
                        <option value="Meia Maratona">Meia Maratona</option>
                        <option value="Maratona">Maratona</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Vagas Máximas *
                      </label>
                      <input
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                        min={1}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Organizador
                    </label>
                    <input
                      type="text"
                      value={formData.organizer}
                      onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <PdfUpload
                    value={formData.regulationPdf}
                    onChange={(url) => setFormData({ ...formData, regulationPdf: url })}
                    label="Regulamento do Evento (PDF)"
                  />

                  <ImageUpload
                    value={formData.routeMap}
                    onChange={(url) => setFormData({ ...formData, routeMap: url })}
                    label="Mapa do Percurso"
                    recommendedWidth={800}
                    recommendedHeight={600}
                    aspectRatio="4:3"
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      O que está incluso (um por linha)
                    </label>
                    <textarea
                      value={formData.includes.join('\n')}
                      onChange={(e) => setFormData({ ...formData, includes: e.target.value.split('\n') })}
                      placeholder="Ex: Medalha de participação&#10;Camisa exclusiva&#10;Hidratação"
                      rows={4}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Regras do Evento (uma por linha)
                    </label>
                    <textarea
                      value={formData.rules.join('\n')}
                      onChange={(e) => setFormData({ ...formData, rules: e.target.value.split('\n') })}
                      placeholder="Ex: Idade mínima: 18 anos&#10;Atestado médico obrigatório"
                      rows={4}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  {/* Auditoria UX P6: retirada do kit — exibida no comprovante e na página do participante */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Data/Horário de Retirada do Kit
                      </label>
                      <input
                        type="text"
                        value={formData.kitPickup}
                        onChange={(e) => setFormData({ ...formData, kitPickup: e.target.value })}
                        placeholder="Ex: 12/11, das 10h às 18h (véspera da prova)"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Local de Retirada do Kit
                      </label>
                      <input
                        type="text"
                        value={formData.kitPickupLocation}
                        onChange={(e) => setFormData({ ...formData, kitPickupLocation: e.target.value })}
                        placeholder="Ex: Loja oficial — Shopping Center, Campinas/SP"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <p className="md:col-span-2 text-xs text-slate-500 -mt-2">
                      Opcional, mas recomendado: estas informações aparecem no comprovante e no QR Code do participante. Se preenchidas, o comprovante deixa de mostrar "consulte o e-mail do organizador".
                    </p>
                  </div>

                  {/* WhatsApp do organizador — habilita o botão "Falar no WhatsApp" na página do evento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        WhatsApp do Organizador <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <div className="relative">
                        <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          inputMode="tel"
                          value={formData.organizerWhatsapp}
                          onChange={(e) => setFormData({ ...formData, organizerWhatsapp: maskPhoneField(e.target.value) })}
                          placeholder="(11) 99999-9999"
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <p className="md:col-span-2 text-xs text-slate-500 -mt-2">
                      Opcional: quando preenchido, a página pública do evento exibe um botão &quot;Falar no WhatsApp&quot; que abre uma conversa direta com o organizador. Assuma DDI 55 (Brasil) quando o número começar com DDD.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Distances */}
              {currentStep === 'distances' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Distâncias e Preços</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Adicione as distâncias disponíveis para este evento
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDistance}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Distância
                    </button>
                  </div>

                  {formData.distances.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <GripVertical className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium">Nenhuma distância adicionada</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Clique em "Adicionar Distância" para começar
                      </p>
                    </div>
                  ) : (
                    <DragDropList
                      items={formData.distances}
                      onReorder={(distances) => setFormData({ ...formData, distances })}
                      onRemove={handleRemoveDistance}
                      renderItem={(distance, index) => (
                        <div className="space-y-3 flex-1">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Nome
                              </label>
                              <input
                                type="text"
                                value={distance.name || ''}
                                onChange={(e) => handleUpdateDistance(index, 'name', e.target.value)}
                                placeholder="Ex: Caminhada"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Distância (km)
                              </label>
                              <input
                                type="number"
                                value={distance.km}
                                onChange={(e) => handleUpdateDistance(index, 'km', parseFloat(e.target.value))}
                                min={0}
                                step={0.1}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Preço (R$)
                              </label>
                              <input
                                type="number"
                                value={distance.price}
                                onChange={(e) => handleUpdateDistance(index, 'price', parseFloat(e.target.value))}
                                min={0}
                                step={0.01}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Descrição (opcional)
                            </label>
                            <input
                              type="text"
                              value={distance.description || ''}
                              onChange={(e) => handleUpdateDistance(index, 'description', e.target.value)}
                              placeholder="Ex: Percurso plano e acessível"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    />
                  )}
                </div>
              )}

              {/* Step 4: Kits */}
              {currentStep === 'kits' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Kits de Inscrição</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Adicione os kits disponíveis para os participantes escolherem
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddKit}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Kit
                    </button>
                  </div>

                  {formData.kits.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium">Nenhum kit adicionado</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Clique em "Adicionar Kit" para começar
                      </p>
                    </div>
                  ) : (
                    <DragDropList
                      items={formData.kits}
                      onReorder={(kits) => setFormData({ ...formData, kits })}
                      onRemove={handleRemoveKit}
                      renderItem={(kit, index) => (
                        <div className="space-y-3 flex-1">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Nome do Kit
                              </label>
                              <input
                                type="text"
                                value={kit.name}
                                onChange={(e) => handleUpdateKit(index, 'name', e.target.value)}
                                placeholder="Ex: Kit 1 - Completo"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Preço (R$)
                              </label>
                              <input
                                type="number"
                                value={kit.price}
                                onChange={(e) => handleUpdateKit(index, 'price', parseFloat(e.target.value))}
                                min={0}
                                step={0.01}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Descrição
                            </label>
                            <input
                              type="text"
                              value={kit.description}
                              onChange={(e) => handleUpdateKit(index, 'description', e.target.value)}
                              placeholder="Ex: Medalha + Camisa + Viseira"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                          <ImageUpload
                            value={kit.image}
                            onChange={(url) => handleUpdateKit(index, 'image', url)}
                            label="Imagem do Kit"
                            recommendedWidth={400}
                            recommendedHeight={300}
                            aspectRatio="4:3"
                          />
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Itens Inclusos (separados por vírgula)
                            </label>
                            <input
                              type="text"
                              value={kit.includes.join(', ')}
                              onChange={(e) => handleUpdateKit(index, 'includes', e.target.value.split(',').map(s => s.trim()))}
                              placeholder="Ex: Medalha, Camisa, Viseira"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                          {formData.distances.length > 0 && (
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Vincular a Distância (opcional)
                              </label>
                              <select
                                value={kit.distance || 0}
                                onChange={(e) => handleUpdateKit(index, 'distance', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              >
                                <option value={0}>Sem vinculação</option>
                                {formData.distances.map((d, i) => (
                                  <option key={i} value={d.km}>
                                    {d.name || `Distância ${i + 1}`} - {d.km}km
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tamanhos de Camisa Disponíveis
                    </label>
                    <input
                      type="text"
                      value={formData.shirtSizes.join(', ')}
                      onChange={(e) => setFormData({ ...formData, shirtSizes: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                      placeholder="Ex: PP, P, M, G, GG, XGG"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Separe os tamanhos por vírgula
                    </p>
                  </div>
                </div>
              )}

              {/* Step 5: Publish */}
              {currentStep === 'publish' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Configurações de Publicação</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Status de Publicação
                      </label>
                      <select
                        value={formData.published ? 'published' : 'draft'}
                        onChange={(e) => setFormData({ ...formData, published: e.target.value === 'published' })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="draft">Rascunho (não publicado)</option>
                        <option value="published">Publicado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Status das Inscrições
                      </label>
                      <select
                        value={formData.registrationStatus}
                        onChange={(e) => setFormData({ ...formData, registrationStatus: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="upcoming">Inscrições Abertas</option>
                        <option value="closed">Inscrições Encerradas</option>
                        <option value="finished">Evento Finalizado</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <label htmlFor="featured" className="text-sm font-medium text-slate-700">
                        Destacar este evento na página inicial
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Desconto (%)
                      </label>
                      <input
                        type="number"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) })}
                        min={0}
                        max={100}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tags (separadas por vírgula)
                      </label>
                      <input
                        type="text"
                        value={formData.tags.join(', ')}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()) })}
                        placeholder="Ex: outubro-rosa, mulheres, saúde"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm text-emerald-800">
                      <strong>Resumo:</strong> Seu evento terá {formData.distances.length} distância(s), {formData.kits.length} kit(s) e {formData.maxParticipants} vagas.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="w-96 p-6 overflow-y-auto bg-slate-50">
                <EventPreview data={formData} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 'basic'}
              className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex items-center gap-3">
              {currentStep === 'publish' ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed()}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-medium rounded-lg hover:from-emerald-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {race ? 'Salvar Alterações' : 'Criar Evento'}
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
