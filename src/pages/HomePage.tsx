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
import { Users, Calendar, MapPin, RefreshCw, Search, Star, Trophy } from 'lucide-react';

export default function HomePage() {
  const { races, refreshData } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const handleRefresh = () => {
    refreshData();
    setLastSync(new Date());
  };
  
  const categories = [
    { id: 'all', name: 'Todos', icon: Trophy },
    { id: 'corrida', name: 'Corrida', icon: Users },
    { id: 'ciclismo', name: 'Ciclismo', icon: Calendar },
    { id: 'triathlon', name: 'Triathlon', icon: Star },
    { id: 'trail', name: 'Trail Run', icon: MapPin },
  ];

  const filtered = races.filter(r => {
    // Mostrar apenas eventos publicados
    const isVisible = r.published;
    const matchesSearch = isVisible && 
      (r.name.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || r.sport === selectedCategory;
    const matchesDate = selectedDate === 'all' || 
      (selectedDate === 'week' && new Date(r.date) > new Date() && new Date(r.date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) ||
      (selectedDate === 'month' && new Date(r.date) > new Date() && new Date(r.date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  const featuredRaces = races.filter(r => r.featured && r.published && canRegister(r)).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section - Professional Design with Green/Blue Palette */}
      <section className="relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-sky-600 py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/95 via-emerald-600/90 to-sky-600/95"></div>
        
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-block mb-5">
              <span className="px-5 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium rounded-full">
                +500 eventos disponíveis em todo Brasil
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Encontre seu próximo<br />
              <span className="text-emerald-100">desafio esportivo</span>
            </h1>
            <p className="text-lg text-emerald-50 mb-10 max-w-2xl mx-auto leading-relaxed">
              A plataforma completa para inscrição em eventos esportivos. 
              Corridas, ciclismo, triathlon e muito mais.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-2xl p-1.5 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-5">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar evento, cidade ou modalidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-3.5 text-base text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <button className="px-8 py-3.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                Buscar
              </button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['São Paulo', 'Rio de Janeiro', 'Corrida', 'Ciclismo', 'Este mês'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSearch(filter)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      {featuredRaces.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 -mt-14 relative z-10 mb-16">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Eventos em Destaque</h2>
                <p className="text-slate-500 text-sm mt-1">Os mais procurados da semana</p>
              </div>
              <Link to="/" className="text-slate-900 font-semibold hover:text-slate-700 transition-colors">
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredRaces.map((race) => (
                <Link
                  key={race.id}
                  to={`/evento/${race.id}`}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-video relative">
                    <img
                      src={race.image}
                      alt={race.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded">
                        DESTAQUE
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{race.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{format(parseISO(race.date), "dd/MM/yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>{race.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Filters */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide flex-1">
            {categories.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleRefresh}
            className="ml-4 p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title={`Sincronizar dados (última sincronização: ${lastSync.toLocaleTimeString('pt-BR')})`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-3 mt-5">
          <span className="text-sm font-semibold text-slate-700">Quando:</span>
          {[
            { id: 'all', name: 'Todas as datas' },
            { id: 'week', name: 'Esta semana' },
            { id: 'month', name: 'Este mês' },
          ].map((date) => (
            <button
              key={date.id}
              onClick={() => setSelectedDate(date.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDate === date.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200 hover:border-sky-300'
              }`}
            >
              {date.name}
            </button>
          ))}
        </div>
      </section>

      {/* Events Grid - Professional Cards with Green/Blue Palette */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {filtered.length} {filtered.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
            </h2>
            <p className="text-slate-500 mt-1">
              {selectedCategory !== 'all' && `${categories.find(c => c.id === selectedCategory)?.name} • `}
              {selectedDate !== 'all' && `${selectedDate === 'week' ? 'Esta semana' : 'Este mês'}`}
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Search className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum evento encontrado</h3>
            <p className="text-slate-500 mb-8">Tente ajustar seus filtros ou buscar por outro termo</p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('all'); setSelectedDate('all'); }}
              className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(race => (
              <Link
                key={race.id}
                to={`/evento/${race.id}`}
                className="group bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  <img
                    src={race.image}
                    alt={race.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded ${getRegistrationStatusColor(getRegistrationStatus(race))}`}>
                      {getRegistrationStatusText(getRegistrationStatus(race))}
                    </span>
                  </div>

                  {/* Discount Badge */}
                  {race.discount && race.discount > 0 && (
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded">
                        {race.discount}% OFF
                      </span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-end justify-between">
                      <div>
                        {race.discount && race.discount > 0 ? (
                          <>
                            <span className="text-sm text-white/70 line-through">
                              R$ {formatBRL(getLowestPrice(race))}
                            </span>
                            <div className="text-2xl font-bold text-white">
                              R$ {formatBRL(discounted(getLowestPrice(race), race.discount))}
                            </div>
                          </>
                        ) : (
                          <div className="text-2xl font-bold text-white">
                            R$ {formatBRL(getLowestPrice(race))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-white font-semibold text-sm">{race.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 text-lg mb-4 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    {race.name}
                  </h3>
                  
                  <div className="space-y-2.5 mb-5">
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>{format(parseISO(race.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <span className="truncate">{race.city}, {race.state}</span>
                    </div>
                  </div>

                  {/* Distance Tags */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                    {race.distances.slice(0, 3).map((d, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded"
                      >
                        {d.km}km
                      </span>
                    ))}
                    {race.distances.length > 3 && (
                      <span className="px-3 py-1.5 bg-slate-50 text-slate-500 text-xs font-medium rounded">
                        +{race.distances.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Stats Section - Green/Blue Gradient */}
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-sky-600 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">A maior plataforma de eventos esportivos</h2>
            <p className="text-emerald-50">Números que comprovam nossa excelência</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">500+</div>
              <div className="text-emerald-100 text-sm font-medium">Eventos Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">250K+</div>
              <div className="text-emerald-100 text-sm font-medium">Atletas Inscritos</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">27</div>
              <div className="text-emerald-100 text-sm font-medium">Estados</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">98%</div>
              <div className="text-emerald-100 text-sm font-medium">Satisfação</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Green/Blue Professional */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-600 p-2.5 rounded-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-white">Smart Brasil Ticket</span>
              </div>
              <p className="text-sm leading-relaxed">
                A maior plataforma de inscrições para eventos esportivos do Brasil.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Para Atletas</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/" className="hover:text-emerald-400 transition-colors">Encontrar Eventos</Link></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Como Funciona</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Central de Ajuda</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Para Organizadores</h3>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Criar Evento</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Planos e Preços</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Recursos</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Redes Sociais</h3>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm">
            <p>&copy; 2024 Smart Brasil Ticket. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
