import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { AlertCircle, Calendar, CheckCircle, CreditCard, Heart, MapPin, Share2, Shield, Star, Trophy } from 'lucide-react';
import { whatsappLink } from '../utils/documents';

export default function RaceDetailsPage() {
  const { id } = useParams();
  const { getRaceById } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const race = id ? getRaceById(id) : null;

  // Auditoria UX T3: meta tags Open Graph dinâmicas (compartilhamento em WhatsApp/FB/LinkedIn).
  useEffect(() => {
    if (race) setEventShareMeta(race);
    return () => resetShareMeta();
  }, [race?.id]);

  if (!race) return <div className="text-center py-20">Evento não encontrado</div>;

  const handleRegister = () => {
    if (!user) {
      // Auditoria UX P2: levar o destino - apos login/registro volta direto para a inscricao.
      const target = `/inscricao/${race.id}${selectedDistance ? `?distance=${selectedDistance}` : ''}`;
      navigate(`/login?from=${encodeURIComponent(target)}`);
      return;
    }
    if (!selectedDistance) return;
    navigate(`/inscricao/${race.id}?distance=${selectedDistance}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: race.name,
        text: `Confira este evento: ${race.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copiado!', 'success');
    }
  };

  const minPrice = getLowestPrice(race);
  const occupancyRate = (race.participants / race.maxParticipants) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Enhanced */}
      <div className="relative h-96 md:h-[500px]">
        <img src={race.image} alt={race.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        
        {/* Action Buttons */}
        <div className="absolute top-6 right-6 flex gap-3">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-3 rounded-full backdrop-blur-sm transition-all ${
              isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleShare}
            className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-all"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              {race.featured && (
                <span className="px-4 py-1.5 bg-amber-500 text-amber-950 text-sm font-semibold rounded">
                  DESTAQUE
                </span>
              )}
              {race.discount && race.discount > 0 && (
                <span className="px-4 py-1.5 bg-rose-600 text-white text-sm font-semibold rounded">
                  {race.discount}% OFF
                </span>
              )}
              <span className={`px-4 py-1.5 text-sm font-semibold rounded ${getRegistrationStatusColor(getRegistrationStatus(race))}`}>
                {getRegistrationStatusText(getRegistrationStatus(race))}
              </span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">{race.name}</h1>
            <div className="flex items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="font-semibold">{race.rating}</span>
                <span className="text-sm">({race.reviews} avaliações)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Data</span>
                </div>
                <p className="font-bold text-gray-900">{format(parseISO(race.date), "dd 'de' MMMM", { locale: ptBR })}</p>
                <p className="text-sm text-gray-500">{race.time}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-sky-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-sky-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Local</span>
                </div>
                <p className="font-bold text-slate-900">{race.location}</p>
                <p className="text-sm text-slate-500">{race.city}, {race.state}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Trophy className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Organizador</span>
                </div>
                <p className="font-bold text-slate-900 truncate">{race.organizer}</p>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-4 text-slate-900">Sobre o Evento</h2>
              <p className="text-slate-600 leading-relaxed">{race.description}</p>
              
              {/* Tags */}
              {race.tags && race.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
                  {race.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Kits and Prices */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6 text-slate-900">Escolha seu Kit</h2>
              {race.kits && race.kits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {race.kits.map(kit => (
                    <button
                      key={kit.id}
                      onClick={() => setSelectedDistance(kit.distance || 0)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedDistance === (kit.distance || 0)
                          ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
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
                        <div>
                          {race.discount && race.discount > 0 ? (
                            <>
                              <p className="text-sm text-slate-400 line-through">
                                R$ {formatBRL(kit.price)}
                              </p>
                              <p className="text-2xl font-bold text-emerald-600">
                                R$ {formatBRL(discounted(kit.price, race.discount))}
                              </p>
                            </>
                          ) : (
                            <p className="text-2xl font-bold text-emerald-600">
                              R$ {formatBRL(kit.price)}
                            </p>
                          )}
                        </div>
                        {kit.distance && kit.distance > 0 && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                            {kit.distance}km
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {race.distances.map(d => (
                    <button
                      key={d.km}
                      onClick={() => setSelectedDistance(d.km)}
                      className={`w-full flex items-center justify-between p-5 rounded-lg border-2 transition-all ${
                        selectedDistance === d.km
                          ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          selectedDistance === d.km ? 'bg-emerald-600' : 'bg-slate-100'
                        }`}>
                          <span className={`text-lg font-bold ${
                            selectedDistance === d.km ? 'text-white' : 'text-slate-600'
                          }`}>
                            {d.km}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-lg text-slate-900">{d.km} km</p>
                          <p className="text-sm text-slate-500">
                            {d.km <= 5 ? 'Iniciante' : d.km <= 10 ? 'Intermediário' : 'Avançado'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {race.discount && race.discount > 0 ? (
                          <>
                            <p className="text-sm text-slate-400 line-through">
                              R$ {formatBRL(d.price)}
                            </p>
                            <p className="text-2xl font-bold text-emerald-600">
                              R$ {formatBRL(discounted(d.price, race.discount))}
                            </p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold text-emerald-600">
                            R$ {formatBRL(d.price)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* What's Included */}
            {race.includes && race.includes.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">O que está incluso</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {race.includes.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mapa do percurso */}
            {race.routeMap && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">Mapa do Percurso</h2>
                <a href={race.routeMap} target="_blank" rel="noopener noreferrer" title="Abrir em tamanho original">
                  <img src={race.routeMap} alt={`Mapa do percurso - ${race.name}`} loading="lazy" className="w-full rounded-lg border border-slate-200" />
                </a>
              </div>
            )}

            {/* Regulamento */}
            {race.regulationPdf && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">Regulamento</h2>
                <a
                  href={race.regulationPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Ver / baixar regulamento (PDF)
                </a>
              </div>
            )}

            {/* Rules */}
            {race.rules && race.rules.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">Regras e Informações</h2>
                <div className="space-y-3">
                  {race.rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Sticky Registration Card */}
          <div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 sticky top-6">
              <h3 className="text-xl font-bold mb-4 text-slate-900">Garanta sua vaga</h3>
              
              {/* Occupancy Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Vagas preenchidas</span>
                  <span className="font-semibold text-slate-900">{Math.round(occupancyRate)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      occupancyRate > 80 ? 'bg-rose-500' :
                      occupancyRate > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${occupancyRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {race.participants.toLocaleString('pt-BR')} de {race.maxParticipants.toLocaleString('pt-BR')} vagas
                </p>
              </div>

              {/* Selected Distance */}
              {selectedDistance ? (
                <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm text-emerald-700 mb-1">Distância selecionada</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedDistance} km</p>
                  {race.discount && race.discount > 0 ? (
                    <>
                      <p className="text-sm text-slate-400 line-through mt-2">
                        R$ {formatBRL(race.distances.find(d => d.km === selectedDistance)?.price)}
                      </p>
                      <p className="text-3xl font-bold text-emerald-600">
                        R$ {formatBRL(discounted(race.distances.find(d => d.km === selectedDistance)?.price, race.discount))}
                      </p>
                    </>
                  ) : (
                    <p className="text-3xl font-bold text-emerald-600 mt-2">
                      R$ {formatBRL(race.distances.find(d => d.km === selectedDistance)?.price)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500">Selecione uma distância</p>
                  <p className="text-2xl font-bold text-slate-400 mt-2">
                    A partir de R$ {formatBRL(minPrice)}
                  </p>
                </div>
              )}

              {/* Register Button */}
              <button
                onClick={handleRegister}
                disabled={!selectedDistance || !canRegister(race)}
                className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                  selectedDistance && canRegister(race)
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {canRegister(race) ? 'Realizar Inscrição' : getRegistrationStatusText(getRegistrationStatus(race))}
              </button>

              {/* Botão WhatsApp — aparece somente se o admin cadastrou o número do organizador */}
              {(() => {
                const wa = whatsappLink(race.organizerWhatsapp, `Olá! Tenho uma dúvida sobre o evento ${race.name}.`);
                return wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white font-semibold rounded-lg hover:brightness-95 transition-all shadow-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Falar no WhatsApp com o organizador
                  </a>
                ) : null;
              })()}

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Pagamento 100% seguro</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Confirmação instantânea</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <span>PIX, Cartão ou Maquininha</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
