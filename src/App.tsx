import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { Race, Registration, Payment } from './types';
import { supabase, isDemoMode } from './lib/supabase';
import DiagnosticPage from './pages/DiagnosticPage';
import TestSupabase from './pages/TestSupabase';
import EventForm from './components/EventForm';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getRegistrationStatus, getRegistrationStatusText, getRegistrationStatusColor, canRegister } from './utils/raceStatus';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Trophy, Calendar, MapPin, Users, Star, Search, Filter, 
  User, Mail, Lock, Unlock, Eye, EyeOff, ArrowRight, ArrowLeft,
  LogOut, LayoutDashboard, CreditCard, FileText, CheckCircle,
  QrCode, Copy, Check, Shield, Download, Plus, Edit, Trash2,
  DollarSign, AlertCircle, Phone, Home as HomeIcon, Heart, Share2, RefreshCw, X
} from 'lucide-react';

// ============ COMPONENTS ============

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900 tracking-tight">
              Smart Brasil Ticket
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <Link to="/minha-conta" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-emerald-400 transition-colors">
                  <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">{user.name.charAt(0)}</span>
                  </div>
                  {user.name.split(' ')[0]}
                </Link>
                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-emerald-600 transition-colors" title="Sair">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-emerald-400 transition-colors">
                  <User className="w-4 h-4" />
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole?: 'admin' | 'participant' }) {
  const { user } = useAuth();
  if (!user) return <Link to="/login" className="block text-center py-20 text-emerald-600">Faça login para continuar →</Link>;
  // Admins can access any page, participants can only access participant pages
  const userRole = user.role as string;
  if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
    return <div className="text-center py-20">
      <p className="text-xl text-gray-700 mb-4">Acesso negado</p>
      <p className="text-gray-500 mb-4">Você precisa de permissão para acessar esta página.</p>
      {userRole === 'admin' ? (
        <Link to="/admin" className="text-emerald-600 hover:underline">Ir para Dashboard Admin →</Link>
      ) : (
        <Link to="/" className="text-emerald-600 hover:underline">Voltar para a página inicial →</Link>
      )}
    </div>;
  }
  return <>{children}</>;
}

// ============ ERROR BOUNDARY ============
// Captura erros de render (ex.: dados incompletos vindos do banco) e mostra um
// estado claro em vez de deixar a tela completamente em branco.

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: Error | null };

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Erro capturado pelo ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <p className="font-bold text-slate-900 mb-1">Algo deu errado nesta tela</p>
            <p className="text-sm text-slate-500 mb-4 break-words">{String(this.state.error?.message || this.state.error)}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
                Recarregar página
              </button>
              <button onClick={() => { window.location.href = '/'; }} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">
                Voltar para o início
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============ HELPERS DE PREÇO (DEFENSIVOS) ============
// O Supabase pode retornar valores NUMERIC como string, null ou até colunas
// ausentes (ex.: "price" dentro do JSON de kits/distances quando o admin salvou
// sem preencher). Qualquer acesso direto a .toFixed() desses valores derruba o
// React e causa a temida tela em branco. Todos os renders de moeda passam por
// estes helpers, que SEMPRE devolvem um número seguro.

const toSafeNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Menor preço entre distâncias E kits — usado nos cards/listas onde antes só
// existia Math.min(...distances.map(d => d.price)), que quebrava com price null.
const getLowestPrice = (race?: { distances?: any[]; kits?: any[] } | null): number => {
  if (!race) return 0;
  const prices = [
    ...(race.distances || []).map((d: any) => toSafeNumber(d?.price)),
    ...(race.kits || []).map((k: any) => toSafeNumber(k?.price)),
  ].filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : 0;
};

// Preço efetivo de uma distância/kit já aplicando o desconto do evento.
const discounted = (price: any, discount?: number) =>
  toSafeNumber(price) * (1 - toSafeNumber(discount) / 100);

const formatBRL = (value: any): string =>
  toSafeNumber(value).toFixed(2).replace('.', ',');

// ============ PAGES ============

function HomePage() {
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

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', cpf: '', phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        // Wait a bit for user context to update, then redirect based on role
        setTimeout(() => {
          const currentUser = JSON.parse(localStorage.getItem('rb_session') || 'null');
          if (currentUser && currentUser.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/minha-conta');
          }
        }, 500);
      } else {
        setError(result.message);
      }
    } else {
      const result = await register({ ...formData, role: 'participant' });
      if (result.success) navigate('/minha-conta');
      else setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-sky-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{isLogin ? 'Entrar' : 'Criar Conta'}</h2>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <input type="text" placeholder="Nome completo" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />}
          <input type="email" placeholder="E-mail" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {!isLogin && (
            <>
              <input type="text" placeholder="CPF" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
              <input type="tel" placeholder="Telefone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
            </>
          )}
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-sky-700 transition-all">{isLogin ? 'Entrar' : 'Criar Conta'}</button>
        </form>

        {isLogin && (
          <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-xl">
            <p className="text-xs font-semibold text-sky-700 mb-2">Credenciais de teste:</p>
            <p className="text-xs text-sky-600"><strong>Admin:</strong> admin@smartbrasilticket.com.br / admin123</p>
            <p className="text-xs text-sky-600"><strong>Participante:</strong> joao@email.com / 123456</p>
          </div>
        )}

        <p className="text-center text-sm text-slate-600 mt-6">
          {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-emerald-600 font-semibold hover:text-emerald-700">{isLogin ? 'Cadastre-se' : 'Fazer login'}</button>
        </p>
      </div>
    </div>
  );
}

function RaceDetailsPage() {
  const { id } = useParams();
  const { getRaceById } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const race = id ? getRaceById(id) : null;

  if (!race) return <div className="text-center py-20">Evento não encontrado</div>;

  const handleRegister = () => {
    if (!user) { navigate('/login'); return; }
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
      alert('Link copiado!');
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

function RegistrationPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { getRaceById, addRegistration } = useData();
  const navigate = useNavigate();
  const race = id ? getRaceById(id) : null;
  const [step, setStep] = useState(1);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [formData, setFormData] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', cpf: '', birthDate: '', gender: '', 
    tshirtSize: '', address: '', city: '', state: '', zipCode: '', 
    emergencyName: '', emergencyPhone: '', acceptTerms: false, acceptMedical: false 
  });

  if (!race || !user) return <div className="text-center py-20">Dados inválidos</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const getSelectedKit = () => {
    return race.kits?.find(k => k.id === selectedKit);
  };

  const handleSubmit = async () => {
    const kit = getSelectedKit();
    // Validação explícita: sem preço numérico válido a tela de pagamento quebraria
    if (!kit || !Number.isFinite(Number(kit.price)) || Number(kit.price) <= 0) {
      alert('O preço do kit selecionado é inválido. Edite o evento no painel admin e defina um preço (número maior que zero).');
      return;
    }
    try {
      const regId = await addRegistration({
        userId: user.id,
        raceId: race.id,
        distance: kit?.distance || 0,
        tshirtSize: formData.tshirtSize,
        kitId: selectedKit,
        kitName: kit?.name,
        price: Number(kit.price),
        status: 'pending_payment',
        emergencyName: formData.emergencyName,
        emergencyPhone: formData.emergencyPhone,
        // Dados do participante persistidos na inscrição (relatório admin)
        participantFirstName: formData.firstName,
        participantLastName: formData.lastName,
        participantEmail: formData.email,
        participantPhone: formData.phone,
        participantCpf: formData.cpf,
      });
      if (!regId) throw new Error('Inscrição não retornou ID');
      navigate(`/pagamento/${regId}`);
    } catch (error) {
      console.error('Erro ao criar inscrição:', error);
      alert(`Erro ao criar inscrição: ${error instanceof Error ? error.message : 'tente novamente'}.`);
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
                          <span className="text-2xl font-bold text-emerald-600">R$ {formatBRL(kit.price)}</span>
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
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="CPF" className="px-4 py-2.5 border rounded-lg" required />
                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="px-4 py-2.5 border rounded-lg" required />
                </div>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg" required>
                  <option value="">Gênero</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="px-6 py-3 border rounded-xl">Voltar</button>
                  <button onClick={() => setStep(3)} disabled={!formData.firstName || !formData.email || !formData.cpf} className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50">Próximo</button>
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
                  <div className="flex justify-between pt-3 border-t"><span className="font-bold">Total</span><span className="font-bold text-emerald-600">R$ {formatBRL(getSelectedKit()?.price)}</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentPage() {
  const { registrationId } = useParams();
  const { user } = useAuth();
  const { registrations, races, getRaceById, addPayment, updateRegistration } = useData();
  const navigate = useNavigate();
  // Fallback: se a inscrição ainda não estiver na lista em memória (ex.: recarregamento
  // da página, realtime atrasado ou falha de sync), busca direto no Supabase para
  // evitar tela em branco.
  const [fetchedRegistration, setFetchedRegistration] = useState<Registration | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [fetchedRace, setFetchedRace] = useState<Race | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchFallback() {
      if (!registrationId || isDemoMode || !supabase) { setFetchAttempted(true); return; }
      if (registrations.some(r => r.id === registrationId)) { setFetchAttempted(true); return; }
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .eq('id', registrationId)
          .maybeSingle();
        if (error) console.error('Erro ao buscar inscrição:', error);
        if (!cancelled && data) {
          setFetchedRegistration({
            id: data.id,
            userId: data.user_id ?? data.userId,
            raceId: data.race_id ?? data.raceId,
            distance: Number(data.distance ?? 0),
            tshirtSize: data.tshirt_size ?? data.tshirtSize ?? '',
            kitId: data.kit_id ?? data.kitId,
            kitName: data.kit_name ?? data.kitName,
            price: data.price != null ? Number(data.price) : undefined,
            status: data.status,
            paymentId: data.payment_id ?? data.paymentId,
            confirmationCode: data.confirmation_code ?? data.confirmationCode ?? '',
            createdAt: data.created_at ?? data.createdAt,
            emergencyName: data.emergency_name ?? data.emergencyName ?? '',
            emergencyPhone: data.emergency_phone ?? data.emergencyPhone ?? '',
            participantFirstName: data.participant_first_name ?? undefined,
            participantLastName: data.participant_last_name ?? undefined,
            participantEmail: data.participant_email ?? undefined,
            participantPhone: data.participant_phone ?? undefined,
            participantCpf: data.participant_cpf ?? undefined,
          });
        }
      } catch (err) {
        console.error('Erro ao buscar inscrição:', err);
      } finally {
        if (!cancelled) setFetchAttempted(true);
      }
    }
    fetchFallback();
    return () => { cancelled = true; };
  }, [registrationId, registrations]);

  // Fallback para o evento: se a inscrição foi buscada direto do banco mas o evento
  // correspondente ainda não está na lista em memória, busca o evento também.
  const regForLookup = registrations.find(r => r.id === registrationId) || fetchedRegistration;
  useEffect(() => {
    let cancelled = false;
    async function fetchRace() {
      const raceId = regForLookup?.raceId;
      if (!raceId || isDemoMode || !supabase) return;
      if (races.some(r => r.id === raceId)) return;
      try {
        const { data } = await supabase.from('races').select('*').eq('id', raceId).maybeSingle();
        if (!cancelled && data) {
          setFetchedRace({
            ...data,
            image: data.image_url || data.image,
            organizer: data.organizer_name || data.organizer,
            organizerId: data.organizer_id || data.organizerId,
            participants: data.participants_count || data.participants || 0,
            maxParticipants: data.max_participants || data.maxParticipants || 1000,
            registrationStatus: data.registration_status || 'upcoming',
            includes: data.includes || [],
            rules: data.rules || [],
            rating: data.rating || 0,
            reviews: data.reviews_count || data.reviews || 0,
            tags: data.tags || [],
            distances: data.distances || [],
            kits: data.kits || [],
            shirtSizes: data.shirt_sizes || ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
            createdAt: data.created_at,
          } as Race);
        }
      } catch (err) {
        console.error('Erro ao buscar evento:', err);
      }
    }
    fetchRace();
    return () => { cancelled = true; };
  }, [regForLookup?.raceId, races]);

  const registration = regForLookup;
  const race = registration ? (getRaceById(registration.raceId) || (fetchedRace?.id === registration.raceId ? fetchedRace : null)) : null;

  // Preço: prioriza o preço salvo na inscrição; senão procura o kit pelo ID OU pelo
  // nome (o kit pode ter sido recriado/renumerado pelo admin após a inscrição);
  // por fim tenta as distâncias como legado. SEMPRE normalizado com toSafeNumber —
  // qualquer valor null/string/vindo do banco deixa de ser capaz de derrubar a tela.
  const findKitPrice = (): number => {
    const kits: any[] = race?.kits || [];
    const byId = kits.find(k => k.id === registration?.kitId);
    const byName = registration?.kitName ? kits.find(k => k.name === registration.kitName) : undefined;
    const kit = byId || byName;
    return toSafeNumber(kit?.price);
  };
  const rawPrice = toSafeNumber(registration?.price);
  const distanceLegacyPrice = toSafeNumber(race?.distances?.find(d => d.km === registration?.distance)?.price);
  const kitPrice = rawPrice > 0 ? rawPrice : (findKitPrice() || distanceLegacyPrice);
  const total = kitPrice;
  const distancePrice = kitPrice;

  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'credit_card' | 'debit_card' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pixGenerated, setPixGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '', installments: '1' });
  // Integração Mercado Pago (Checkout Pro): estado da confirmação automática de pagamento
  const [mpError, setMpError] = useState<string | null>(null);
  const [mpConfirming, setMpConfirming] = useState(false);
  const mpPollRef = useRef<number | null>(null);

  useEffect(() => () => { if (mpPollRef.current) window.clearInterval(mpPollRef.current); }, []);

  // ============================================
  // CONFIRMAÇÃO AUTOMÁTICA DE PAGAMENTO (Mercado Pago)
  // ============================================
  // Camada 1: webhook mercadopago-webhook atualiza payments/registrations no banco.
  // Camada 2: ao voltar do checkout (?status=approved), confirmamos direto na API
  //           do MP e gravamos no banco caso o webhook ainda não tenha chegado.
  // Camada 3: polling no banco (Supabase Realtime em payments já recarrega a lista,
  //           mas aqui consultamos explicitamente) até status != pending.
  const syncRegistrationStatus = async () => {
    try {
      const { data } = await supabase!
        .from('registrations')
        .select('id, status, payment_id')
        .eq('id', registration!.id)
        .maybeSingle();
      if (data?.status === 'confirmed') {
        navigate(`/comprovante/${registration!.id}`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const startStatusPolling = () => {
    if (mpPollRef.current) window.clearInterval(mpPollRef.current);
    let attempts = 0;
    mpPollRef.current = window.setInterval(async () => {
      attempts += 1;
      if (attempts > 45) { if (mpPollRef.current) window.clearInterval(mpPollRef.current); return; } // ~90s
      const done = await syncRegistrationStatus();
      if (done && mpPollRef.current) window.clearInterval(mpPollRef.current);
    }, 2000);
  };

  // Confirmação server-side via Edge Function (usa token seguro, sem expor credenciais)
  const confirmCheckoutPayment = async (mpPaymentId: string) => {
    const { data: sessionData } = await supabase!.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-checkout-payment`;
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-app-url': window.location.origin,
      },
      body: JSON.stringify({ registrationId: registration!.id, mpPaymentId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  };

  // Detecta retorno do checkout do Mercado Pago (?status=...&collection_id=.../&payment_id=...)
  useEffect(() => {
    if (isDemoMode || !supabase || !registration) return;
    const params = new URLSearchParams(window.location.search);
    const st = params.get('status');
    if (!st) return;
    const collectionId = params.get('collection_id') || params.get('payment_id') || params.get('collector_id');

    // Limpa a query string para não reprocessar ao recarregar
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    (async () => {
      setMpConfirming(true);
      setMpError(null);
      try {
        if (st === 'approved' && collectionId) {
          try {
            await confirmCheckoutPayment(collectionId);
          } catch (err: any) {
            console.warn('Confirmação direta falhou, dependendo do webhook:', err);
          }
        }
        // Verifica o status final no banco (webhook pode ter confirmado antes)
        const confirmed = await syncRegistrationStatus();
        if (!confirmed) {
          if (st === 'approved') {
            // Webhook ainda não chegou — aguarda via polling
            startStatusPolling();
          } else if (st === 'rejected' || st === 'failure') {
            setMpError('O pagamento foi recusado ou cancelado. Você pode tentar novamente com outra forma de pagamento.');
          } else {
            // pending (PIX/cartão em processamento)
            setMpError('Pagamento em processamento. Assim que for aprovado, sua inscrição é confirmada automaticamente — esta página atualiza sozinha.');
            startStatusPolling();
          }
        }
      } finally {
        setMpConfirming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registration]);

  // ============================================
  // INICIAR CHECKOUT MERCADO PAGO (produção)
  // ============================================
  const startMercadoPagoCheckout = async () => {
    setProcessing(true);
    setMpError(null);
    try {
      const { data: sessionData } = await supabase!.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-payment`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-app-url': window.location.origin,
        },
        body: JSON.stringify({ registrationId: registration!.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error || !json?.checkoutUrl) {
        throw new Error(json?.error || `Falha ao iniciar checkout (HTTP ${res.status})`);
      }
      // Redireciona para o checkout oficial do Mercado Pago.
      // Ao concluir, o MP devolve o usuário para /pagamento/:id?status=... e o
      // webhook atualiza o banco automaticamente em paralelo.
      window.location.href = json.checkoutUrl;
    } catch (err: any) {
      setMpError(err?.message || 'Não foi possível iniciar o pagamento. Tente novamente.');
      setProcessing(false);
    }
  };

  // Enquanto o fallback de busca está em andamento, mostra carregamento (evita
  // "piscar" a tela de erro e depois sumir).
  if (!registration && !fetchAttempted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="ml-3 text-gray-600">Carregando sua inscrição...</p>
      </div>
    );
  }

  if (!registration || !user) {
    // Em vez de sumir a tela, mostra um estado claro com ação de voltar
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-slate-900 mb-1">Não encontramos sua inscrição</p>
          <p className="text-sm text-slate-500 mb-4">Pode ser que ela ainda não tenha sincronizado. Volte e tente novamente.</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-slate-900 mb-1">Evento não encontrado</p>
          <p className="text-sm text-slate-500 mb-4">O evento desta inscrição não pôde ser carregado. Verifique sua conexão e tente novamente.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
              Tentar novamente
            </button>
            <button onClick={() => navigate('/')} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bloqueia pagamento de inscrição sem preço válido (ex.: kit salvo no banco com
  // price null e coluna price da inscrição ausente). Mostra estado claro em vez de
  // renderizar uma tela de pagamento quebrada.
  if (total <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <p className="font-bold text-slate-900 mb-1">Valor da inscrição não definido</p>
          <p className="text-sm text-slate-500 mb-4">
            O preço do kit "{registration.kitName || 'selecionado'}" está vazio ou inválido no cadastro do evento.
            Peça ao organizador para editar o evento e preencher o preço do kit, depois volte a esta página.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
              Tentar novamente
            </button>
            <button onClick={() => navigate('/')} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pixCode = `00020126580014br.gov.bcb.pix0136${registration.confirmationCode}520400005303986540${toSafeNumber(total).toFixed(2)}5802BR5925SMARTBRASIL6009SAO PAULO6304ABCD`;

  const handlePixPayment = async () => {
    setProcessing(true);
    setTimeout(async () => {
      const id = await addPayment({
        registrationId: registration.id,
        method: 'pix',
        amount: distancePrice,
        serviceFee: 0,
        total,
        status: 'pending',
        pixCode,
        transactionId: `MP-PIX-${Date.now()}`,
      });
      setPaymentId(id);
      setPixGenerated(true);
      setProcessing(false);
    }, 1500);
  };

  const handleCardPayment = async () => {
    if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
      alert('Preencha todos os dados do cartão');
      return;
    }
    setProcessing(true);
    setTimeout(async () => {
      const method = cardData.installments === '1' ? 'debit_card' : 'credit_card';
      const id = await addPayment({
        registrationId: registration.id,
        method,
        amount: distancePrice,
        serviceFee: 0,
        total,
        status: 'approved',
        transactionId: `MP-CARD-${Date.now()}`,
        paidAt: new Date().toISOString(),
      });
      await updateRegistration(registration.id, { status: 'confirmed', paymentId: id });
      setProcessing(false);
      navigate(`/comprovante/${registration.id}`);
    }, 2000);
  };

  const simulatePixApproval = () => {
    if (paymentId) {
      const payments = JSON.parse(localStorage.getItem('rb_payments') || '[]');
      const updated = payments.map((p: any) => p.id === paymentId ? { ...p, status: 'approved', paidAt: new Date().toISOString() } : p);
      localStorage.setItem('rb_payments', JSON.stringify(updated));
      
      const regs = JSON.parse(localStorage.getItem('rb_registrations') || '[]');
      const updatedRegs = regs.map((r: any) => r.id === registration.id ? { ...r, status: 'confirmed', paymentId } : r);
      localStorage.setItem('rb_registrations', JSON.stringify(updatedRegs));
      
      navigate(`/comprovante/${registration.id}`);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="font-bold">Pagamento</h1><p className="text-sm text-gray-500">{race.name} - {registration.distance}km</p></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold mb-4">Resumo do Pedido</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Inscrição {registration.distance}km</span><span>R$ {formatBRL(distancePrice)}</span></div>
                <div className="flex justify-between pt-3 border-t font-bold text-lg"><span>Total</span><span className="text-orange-600">R$ {formatBRL(total)}</span></div>
              </div>
            </div>

            {!pixGenerated ? (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                {mpConfirming && (
                  <div className="mb-4 flex items-center gap-3 p-4 bg-sky-50 border border-sky-200 rounded-xl">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
                    <p className="text-sm text-sky-800 font-medium">Confirmando seu pagamento junto ao Mercado Pago...</p>
                  </div>
                )}
                {mpError && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">{mpError}</p>
                  </div>
                )}
                <h2 className="font-bold mb-4">Forma de Pagamento</h2>

                {isDemoMode ? (
                  <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <button onClick={() => setSelectedMethod('pix')} className={`p-4 rounded-xl border-2 text-left ${selectedMethod === 'pix' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <QrCode className={`w-5 h-5 mb-2 ${selectedMethod === 'pix' ? 'text-orange-600' : 'text-gray-500'}`} />
                    <p className="font-bold text-sm">PIX</p>
                    <p className="text-xs text-gray-500">Aprovação instantânea via Mercado Pago</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">5% desconto</span>
                  </button>
                  <button onClick={() => setSelectedMethod('credit_card')} className={`p-4 rounded-xl border-2 text-left ${selectedMethod === 'credit_card' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                    <CreditCard className={`w-5 h-5 mb-2 ${selectedMethod === 'credit_card' ? 'text-orange-600' : 'text-gray-500'}`} />
                    <p className="font-bold text-sm">Cartão</p>
                    <p className="text-xs text-gray-500">Crédito em até 12x via Mercado Pago</p>
                  </button>
                </div>

                {selectedMethod === 'pix' && (
                  <button onClick={handlePixPayment} disabled={processing} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50 hover:from-emerald-700 hover:to-sky-700 transition-all">
                    {processing ? 'Gerando PIX...' : 'Gerar PIX'}
                  </button>
                )}

                {selectedMethod === 'credit_card' && (
                  <div className="space-y-3">
                    <input type="text" value={cardData.number} onChange={(e) => setCardData({...cardData, number: e.target.value})} placeholder="Número do cartão" maxLength={19} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    <input type="text" value={cardData.name} onChange={(e) => setCardData({...cardData, name: e.target.value})} placeholder="Nome no cartão" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={cardData.expiry} onChange={(e) => setCardData({...cardData, expiry: e.target.value})} placeholder="MM/AA" maxLength={5} className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                      <input type="text" value={cardData.cvv} onChange={(e) => setCardData({...cardData, cvv: e.target.value})} placeholder="CVV" maxLength={4} className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <select value={cardData.installments} onChange={(e) => setCardData({...cardData, installments: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500">
                      <option value="1">1x de R$ {formatBRL(total)} (sem juros)</option>
                      <option value="2">2x de R$ {formatBRL(total / 2)} (sem juros)</option>
                      <option value="3">3x de R$ {formatBRL(total / 3)} (sem juros)</option>
                      <option value="6">6x de R$ {formatBRL(total / 6 * 1.05)} (com juros)</option>
                      <option value="12">12x de R$ {formatBRL(total / 12 * 1.12)} (com juros)</option>
                    </select>
                    <button onClick={handleCardPayment} disabled={processing} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-sky-700 transition-all">
                      <Shield className="w-4 h-4" />
                      {processing ? 'Processando...' : `Pagar R$ ${formatBRL(total)}`}
                    </button>
                  </div>
                )}
                  </>
                ) : (
                  <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <button onClick={() => setSelectedMethod('pix')} className={`p-4 rounded-xl border-2 text-left ${selectedMethod === 'pix' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                    <QrCode className={`w-5 h-5 mb-2 ${selectedMethod === 'pix' ? 'text-emerald-600' : 'text-gray-500'}`} />
                    <p className="font-bold text-sm">PIX</p>
                    <p className="text-xs text-gray-500">Aprovação instantânea via Mercado Pago</p>
                  </button>
                  <button onClick={() => setSelectedMethod('credit_card')} className={`p-4 rounded-xl border-2 text-left ${selectedMethod === 'credit_card' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                    <CreditCard className={`w-5 h-5 mb-2 ${selectedMethod === 'credit_card' ? 'text-emerald-600' : 'text-gray-500'}`} />
                    <p className="font-bold text-sm">Cartão de Crédito</p>
                    <p className="text-xs text-gray-500">Até 12x — checkout seguro Mercado Pago</p>
                  </button>
                </div>

                {selectedMethod && (
                  <button onClick={startMercadoPagoCheckout} disabled={processing || mpConfirming} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-sky-700 transition-all">
                    <Shield className="w-4 h-4" />
                    {processing ? 'Redirecionando para o Mercado Pago...' : `Pagar R$ ${formatBRL(total)} com ${selectedMethod === 'pix' ? 'PIX' : 'Cartão'}`}
                  </button>
                )}
                <p className="text-xs text-slate-400 mt-3 text-center">
                  Você será redirecionado para o ambiente seguro do Mercado Pago. Ao concluir, volta automaticamente e a inscrição é confirmada sem ação manual.
                </p>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <QrCode className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2 text-slate-900">Pague com PIX</h2>
                <p className="text-sm text-slate-500 mb-6">Escaneie o QR Code ou copie o código</p>
                <div className="w-56 h-56 mx-auto bg-slate-100 rounded-xl mb-6 flex items-center justify-center">
                  <div className="text-slate-400">QR Code</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-slate-500 mb-1">Código PIX:</p>
                  <p className="text-xs font-mono break-all text-slate-700">{pixCode}</p>
                  <button onClick={copyPixCode} className="mt-2 text-xs text-emerald-600 flex items-center gap-1 mx-auto hover:text-emerald-700">
                    {copied ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar código</>}
                  </button>
                </div>
                <button onClick={simulatePixApproval} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-sky-700 transition-all">
                  Simular Aprovação (Demo)
                </button>
                <p className="text-xs text-slate-400 mt-2">Em produção, aprovação é automática via webhook Mercado Pago</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm h-fit sticky top-20">
            <h3 className="font-bold mb-3">Segurança</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2"><Shield className="w-4 h-4 text-green-500 mt-0.5" /><span>Pagamento seguro via Mercado Pago</span></div>
              <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-orange-500 mt-0.5" /><span>Confirmação instantânea</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptPage() {
  const { registrationId } = useParams();
  const { user } = useAuth();
  const { registrations, getRaceById, getPaymentByRegistration } = useData();
  const navigate = useNavigate();
  // Fallback: se a inscrição ainda não está na lista (ex.: recarregou antes do refresh),
  // tenta buscá-la direto no Supabase para evitar tela em branco.
  const [fetchedRegistration, setFetchedRegistration] = useState<Registration | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchFallback() {
      if (!registrationId || isDemoMode || !supabase) { setFetchAttempted(true); return; }
      if (registrations.some(r => r.id === registrationId)) { setFetchAttempted(true); return; }
      try {
        const { data } = await supabase
          .from('registrations')
          .select('*')
          .eq('id', registrationId)
          .maybeSingle();
        if (!cancelled && data) {
          setFetchedRegistration({
            id: data.id,
            userId: data.user_id ?? data.userId,
            raceId: data.race_id ?? data.raceId,
            distance: Number(data.distance ?? 0),
            tshirtSize: data.tshirt_size ?? data.tshirtSize ?? '',
            kitId: data.kit_id ?? data.kitId,
            kitName: data.kit_name ?? data.kitName,
            price: data.price != null ? Number(data.price) : undefined,
            status: data.status,
            paymentId: data.payment_id ?? data.paymentId,
            confirmationCode: data.confirmation_code ?? data.confirmationCode ?? '',
            createdAt: data.created_at ?? data.createdAt,
            emergencyName: data.emergency_name ?? data.emergencyName ?? '',
            emergencyPhone: data.emergency_phone ?? data.emergencyPhone ?? '',
            participantFirstName: data.participant_first_name ?? undefined,
            participantLastName: data.participant_last_name ?? undefined,
            participantEmail: data.participant_email ?? undefined,
            participantPhone: data.participant_phone ?? undefined,
            participantCpf: data.participant_cpf ?? undefined,
          });
        }
      } catch (err) {
        console.error('Erro ao buscar inscrição:', err);
      } finally {
        if (!cancelled) setFetchAttempted(true);
      }
    }
    fetchFallback();
    return () => { cancelled = true; };
  }, [registrationId, registrations]);

  const registration = registrations.find(r => r.id === registrationId) || fetchedRegistration;
  const race = registration ? getRaceById(registration.raceId) : null;
  const payment = registration ? getPaymentByRegistration(registration.id) : null;

  if (!registration && !fetchAttempted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="ml-3 text-gray-600">Carregando comprovante...</p>
      </div>
    );
  }

  if (!registration || !race || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-slate-900 mb-1">Comprovante não encontrado</p>
          <p className="text-sm text-slate-500 mb-4">Não foi possível carregar os dados desta inscrição.</p>
          <button onClick={() => navigate('/minha-conta')} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
            Minhas inscrições
          </button>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-bold text-slate-900 mb-1">Pagamento ainda não registrado</p>
          <p className="text-sm text-slate-500 mb-4">Assim que o pagamento for confirmado, o comprovante aparecerá aqui.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg font-medium">
            Atualizar
          </button>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    // Gera o comprovante em PDF (jsPDF já incluído no projeto)
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 20;
    let y = 0;

    // Cabeçalho com gradiente (faixa sólida em verde)
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SMART BRASIL TICKET', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprovante de Inscrição Confirmada', pageW / 2, 23, { align: 'center' });

    y = 44;

    // Status de confirmação
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PAGAMENTO CONFIRMADO', pageW / 2, y, { align: 'center' });
    y += 10;

    // Código de confirmação
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Código de Confirmação', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(16);
    doc.setFont('courier', 'bold');
    doc.text(registration.confirmationCode || '-', pageW / 2, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, y, pageW - marginX, y);
    y += 10;

    const sectionTitle = (title: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(5, 150, 105);
      doc.text(title.toUpperCase(), marginX, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
    };
    const row = (label: string, value: string) => {
      doc.setTextColor(100, 116, 139);
      doc.text(`${label}:`, marginX, y);
      doc.setTextColor(30, 41, 59);
      doc.text(value || '-', marginX + 45, y);
      y += 6;
    };

    sectionTitle('Evento');
    row('Nome', race.name);
    row('Data', `${format(parseISO(race.date), 'dd/MM/yyyy')} às ${race.time || ''}`.trim());
    row('Local', `${race.location || ''}, ${race.city || ''}/${race.state || ''}`);
    y += 4;

    sectionTitle('Participante');
    row('Nome', user.name);
    row('CPF', user.cpf);
    y += 4;

    sectionTitle('Inscrição');
    if (registration.kitName) row('Kit', registration.kitName);
    if (registration.distance) row('Distância', `${registration.distance} km`);
    if (registration.tshirtSize) row('Camiseta', `Tam. ${registration.tshirtSize}`);
    y += 4;

    sectionTitle('Pagamento');
    row('Método', `${payment.method === 'pix' ? 'PIX' : 'Cartão'} (Mercado Pago)`);
    row('Inscrição', `R$ ${formatBRL(payment.amount)}`);
    row('Taxa', `R$ ${formatBRL(toSafeNumber(payment.total) - toSafeNumber(payment.amount))}`);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105);
    row('TOTAL', `R$ ${formatBRL(payment.total)}`);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    row('Status', 'APROVADO');
    row('Transação', String(payment.transactionId || '-'));
    y += 8;

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} - Smart Brasil Ticket`, pageW / 2, 285, { align: 'center' });
    doc.text('Apresente este comprovante (código de confirmação) na retirada do kit.', pageW / 2, 290, { align: 'center' });

    doc.save(`comprovante-${registration.confirmationCode}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            <div><h1 className="font-bold text-slate-900">Comprovante</h1><p className="text-sm text-slate-500">{registration.confirmationCode}</p></div>
          </div>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-lg text-sm font-medium hover:from-emerald-700 hover:to-sky-700 transition-all">
            <Download className="w-4 h-4" /> Baixar
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-emerald-600 to-sky-600 p-6 text-center">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white">Pagamento Confirmado!</h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center pb-6 border-b border-slate-200">
              <p className="text-xs text-slate-500 uppercase">Código de Confirmação</p>
              <p className="text-3xl font-mono font-bold text-slate-900">{registration.confirmationCode}</p>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900"><Trophy className="w-5 h-5 text-emerald-600" /> Evento</h3>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="font-semibold text-slate-900">{race.name}</p>
                <p className="text-sm text-slate-600">{format(parseISO(race.date), "dd/MM/yyyy")} às {race.time}</p>
                <p className="text-sm text-slate-600">{race.location}, {race.city}/{race.state}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900"><User className="w-5 h-5 text-sky-600" /> Participante</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Nome</p><p className="font-medium text-slate-900">{user.name}</p></div>
                <div><p className="text-slate-500">CPF</p><p className="font-medium text-slate-900">{user.cpf}</p></div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900"><CreditCard className="w-5 h-5 text-emerald-600" /> Pagamento</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Método</span><span className="font-medium text-slate-900">{payment.method === 'pix' ? 'PIX' : 'Cartão'} (Mercado Pago)</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Inscrição</span><span className="text-slate-900">R$ {formatBRL(payment.amount)}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold text-slate-900">Total</span><span className="font-bold text-xl text-emerald-600">R$ {formatBRL(payment.total)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Transação</span><span className="font-mono text-xs text-slate-700">{payment.transactionId}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link to="/minha-conta" className="flex-1 py-3 border border-slate-300 rounded-xl text-center font-medium text-slate-700 hover:bg-slate-50 transition-colors">Minhas Inscrições</Link>
          <Link to="/" className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-xl text-center font-medium hover:from-emerald-700 hover:to-sky-700 transition-all">Ver Mais Eventos</Link>
        </div>
      </div>
    </div>
  );
}

// Helpers do relatório: nome/contato do participante com fallbacks
// (inscrições antigas não têm os campos persistidos; tenta o perfil demo)
function getParticipantName(reg: Registration): string {
  const full = [reg.participantFirstName, reg.participantLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (full) return full;
  if (reg.userId === 'user-001') return 'João Pereira';
  if (reg.userId === 'user-002') return 'Maria Silva';
  return '-';
}

function getParticipantPhone(reg: Registration): string {
  return reg.participantPhone || '-';
}

function getParticipantEmail(reg: Registration): string {
  return reg.participantEmail || '-';
}

function getParticipantCpf(reg: Registration): string {
  return reg.participantCpf || '-';
}

function getKitLabel(reg: Registration): string {
  return reg.kitName || '-';
}

// Funções de Exportação
function exportToPDF(registrations: Registration[], races: Race[]) {
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

function exportToExcel(registrations: Registration[], races: Race[]) {
  const data = registrations.map(reg => {
    const race = races.find(r => r.id === reg.raceId);
    return {
      'Código': reg.confirmationCode,
      'Participante': getParticipantName(reg),
      'Telefone': getParticipantPhone(reg),
      'E-mail': getParticipantEmail(reg),
      'CPF': getParticipantCpf(reg),
      'Evento': race?.name || 'N/A',
      'Kit Escolhido': getKitLabel(reg),
      'Valor (R$)': toSafeNumber(reg.price),
      'Distância': `${reg.distance}km`,
      'Tamanho Camisa': reg.tshirtSize || 'N/A',
      'Status': reg.status === 'confirmed' ? 'Confirmado' : 'Pendente',
      'Data Inscrição': format(parseISO(reg.createdAt), 'dd/MM/yyyy'),
      'Contato Emergência': reg.emergencyName || 'N/A',
      'Telefone Emergência': reg.emergencyPhone || 'N/A'
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscrições');
  
  // Salvar Excel
  XLSX.writeFile(wb, `inscricoes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// Modal de Detalhes da Inscrição
function RegistrationDetailsModal({ registration, race, onClose }: { registration: Registration; race: Race | undefined; onClose: () => void }) {
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
                <p className="text-sm text-slate-600 mt-1">{race?.date && format(parseISO(race.date), "dd/MM/yyyy")} às {race?.time}</p>
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

function AdminDashboard() {
  const { user, logout } = useAuth();
  const { races, registrations, payments, getStats, addRace, updateRace, deleteRace, approvePayment } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'registrations' | 'payments'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  // Filtros da aba de Inscrições (relatório)
  const [regFilterRace, setRegFilterRace] = useState<string>('all');
  const [regFilterStatus, setRegFilterStatus] = useState<string>('all');
  const [regSearch, setRegSearch] = useState<string>('');
  const stats = getStats();

  const handleLogout = () => { logout(); navigate('/'); };

  // Lista filtrada de inscrições para tabela e exportações do relatório
  const filteredRegistrations = registrations.filter(reg => {
    if (regFilterRace !== 'all' && reg.raceId !== regFilterRace) return false;
    if (regFilterStatus === 'confirmed' && reg.status !== 'confirmed') return false;
    if (regFilterStatus === 'pending' && reg.status === 'confirmed') return false;
    if (regSearch.trim()) {
      const q = regSearch.trim().toLowerCase();
      const raceName = (races.find(r => r.id === reg.raceId)?.name || '').toLowerCase();
      const haystack = [
        getParticipantName(reg), getParticipantPhone(reg), getParticipantEmail(reg),
        getParticipantCpf(reg), reg.confirmationCode, reg.kitName || '', raceName,
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg"><Trophy className="w-5 h-5 text-white" /></div>
            <span className="font-bold">Smart Brasil Ticket</span>
          </Link>
          <p className="text-xs text-gray-500 mt-2">Painel Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'events', label: 'Eventos', icon: Calendar }, { id: 'registrations', label: 'Inscrições', icon: Users }, { id: 'payments', label: 'Pagamentos', icon: CreditCard }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${activeTab === tab.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <tab.icon className="w-5 h-5" />{tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><span className="text-sm font-bold text-orange-600">{user?.name.charAt(0)}</span></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user?.name}</p><p className="text-xs text-gray-500">Admin</p></div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" />Sair</button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Calendar className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.totalEvents}</p><p className="text-xs text-gray-500">Eventos</p></div></div></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><Users className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.totalRegistrations}</p><p className="text-xs text-gray-500">Inscrições</p></div></div></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><DollarSign className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold">R$ {toSafeNumber(stats.totalRevenue).toFixed(0)}</p><p className="text-xs text-gray-500">Receita</p></div></div></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><AlertCircle className="w-5 h-5 text-yellow-600" /></div><div><p className="text-2xl font-bold">{stats.pendingPayments}</p><p className="text-xs text-gray-500">Pendentes</p></div></div></div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Eventos</h1>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg"><Plus className="w-4 h-4" />Novo Evento</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Evento</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {races.map(race => (
                    <tr key={race.id}>
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><img src={race.image} alt="" className="w-12 h-12 rounded-lg object-cover" /><div><p className="font-medium text-sm">{race.name}</p><p className="text-xs text-gray-500">{race.city}</p></div></div></td>
                      <td className="px-6 py-4 text-sm">{format(parseISO(race.date), "dd/MM/yyyy")}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${race.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                            {race.published ? 'Publicado' : 'Rascunho'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRegistrationStatusColor(getRegistrationStatus(race))}`}>
                            {getRegistrationStatusText(getRegistrationStatus(race))}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingRace(race); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => { 
                              try {
                                await updateRace(race.id, { published: !race.published });
                              } catch (error) {
                                console.error('Erro ao atualizar publicação:', error);
                                alert('Erro ao atualizar status. Tente novamente.');
                              }
                            }} 
                            className={`p-1.5 rounded ${race.published ? 'text-orange-600 hover:bg-orange-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            title={race.published ? 'Despublicar' : 'Publicar'}
                          >
                            {race.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={async () => { 
                              try {
                                const newStatus = race.registrationStatus === 'upcoming' ? 'closed' : 'upcoming';
                                await updateRace(race.id, { registrationStatus: newStatus });
                              } catch (error) {
                                console.error('Erro ao atualizar inscrições:', error);
                                alert('Erro ao atualizar status. Tente novamente.');
                              }
                            }} 
                            className={`p-1.5 rounded ${race.registrationStatus === 'upcoming' ? 'text-slate-600 hover:bg-slate-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            title={race.registrationStatus === 'upcoming' ? 'Encerrar inscrições' : 'Reabrir inscrições'}
                          >
                            {race.registrationStatus === 'upcoming' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={async () => { if (confirm('Excluir permanentemente?')) {
                            try {
                              await deleteRace(race.id);
                            } catch (error) {
                              console.error('Erro ao excluir:', error);
                              alert('Erro ao excluir evento. Tente novamente.');
                            }
                          }}} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Inscrições</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToPDF(filteredRegistrations, races)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Exportar PDF
                </button>
                <button
                  onClick={() => exportToExcel(filteredRegistrations, races)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </button>
              </div>
            </div>

            {/* Filtros do relatório */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Buscar por nome, telefone, CPF, e-mail, código ou kit..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <select
                value={regFilterRace}
                onChange={(e) => setRegFilterRace(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos os eventos</option>
                {races.map(race => (
                  <option key={race.id} value={race.id}>{race.name}</option>
                ))}
              </select>
              <select
                value={regFilterStatus}
                onChange={(e) => setRegFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos os status</option>
                <option value="confirmed">Confirmados</option>
                <option value="pending">Pendentes</option>
              </select>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {filteredRegistrations.length} de {registrations.length} inscrições
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Participante</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Telefone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Evento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Camisa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                        Nenhuma inscrição encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : filteredRegistrations.map(reg => {
                    const race = races.find(r => r.id === reg.raceId);
                    return (
                      <tr key={reg.id}>
                        <td className="px-4 py-4 font-mono text-sm">{reg.confirmationCode}</td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-900">
                          {getParticipantName(reg)}
                          {reg.participantEmail && (
                            <p className="text-xs font-normal text-gray-500">{reg.participantEmail}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">{getParticipantPhone(reg)}</td>
                        <td className="px-4 py-4 text-sm">{race?.name || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm">{reg.kitName || '-'}</td>
                        <td className="px-4 py-4 text-sm">{reg.tshirtSize || 'N/A'}</td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${reg.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{reg.status === 'confirmed' ? 'Confirmado' : 'Pendente'}</span></td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedRegistration(reg)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Pagamentos</h1>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Método</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map(payment => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 font-mono text-sm">{payment.id}</td>
                      <td className="px-6 py-4 text-sm capitalize">{payment.method === 'pix' ? 'PIX' : 'Cartão'}</td>
                      <td className="px-6 py-4 text-sm font-semibold">R$ {formatBRL(payment.total)}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${payment.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{payment.status === 'approved' ? 'Aprovado' : 'Pendente'}</span></td>
                      <td className="px-6 py-4 text-right">{payment.status === 'pending' && <button onClick={async () => {
                        try {
                          await approvePayment(payment.id);
                        } catch (error) {
                          console.error('Erro ao aprovar pagamento:', error);
                          alert('Erro ao aprovar pagamento. Tente novamente.');
                        }
                      }} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="w-4 h-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showForm && user && (
        <EventForm
          race={editingRace}
          organizerId={user.id}
          organizerName={user.name}
          onSave={async (data) => {
            try {
              if (editingRace) {
                await updateRace(editingRace.id, data);
              } else {
                await addRace(data);
              }
              setShowForm(false);
              setEditingRace(null);
            } catch (error) {
              console.error('Erro ao salvar evento:', error);
              alert('Erro ao salvar evento. Tente novamente.');
            }
          }}
          onClose={() => { setShowForm(false); setEditingRace(null); }}
        />
      )}

      {selectedRegistration && (
        <RegistrationDetailsModal
          registration={selectedRegistration}
          race={races.find(r => r.id === selectedRegistration.raceId)}
          onClose={() => setSelectedRegistration(null)}
        />
      )}
    </div>
  );
}

function ParticipantDashboard() {
  const { user, logout } = useAuth();
  const { getRegistrationByUser, getPaymentByRegistration, getRaceById } = useData();
  const navigate = useNavigate();

  if (!user) return null;

  const myRegistrations = getRegistrationByUser(user.id);
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg"><Trophy className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Smart Brasil Ticket</span>
          </Link>
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Link to="/admin" className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                <LayoutDashboard className="w-4 h-4" />
                Painel Admin
              </Link>
            )}
            <Link to="/" className="text-sm text-gray-600 hover:text-orange-600">Ver Eventos</Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" />Sair</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Olá, {user.name.split(' ')[0]}! 👋</h1>

        {user.role === 'admin' && (
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">🎛️ Painel Administrativo</h2>
                <p className="text-purple-100 text-sm">Acesse o painel para gerenciar eventos, inscrições e pagamentos</p>
              </div>
              <Link to="/admin" className="flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition-colors">
                <LayoutDashboard className="w-5 h-5" />
                Acessar Painel
              </Link>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b"><h2 className="text-lg font-bold">Minhas Inscrições</h2></div>
          {myRegistrations.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Você ainda não tem inscrições</p>
              <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg">Encontrar Eventos</Link>
            </div>
          ) : (
            <div className="divide-y">
              {myRegistrations.map(reg => {
                const race = getRaceById(reg.raceId);
                const payment = getPaymentByRegistration(reg.id);
                if (!race) return null;
                return (
                  <div key={reg.id} className="p-6 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <img src={race.image} alt={race.name} className="w-full md:w-24 h-24 rounded-xl object-cover" />
                      <div className="flex-1">
                        <h3 className="font-bold">{race.name}</h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                          <span>{format(parseISO(race.date), "dd/MM/yyyy")}</span>
                          <span>📍 {race.city}</span>
                          <span>🏃 {reg.distance}km</span>
                        </div>
                        <p className="text-xs font-mono text-gray-400 mt-1">Código: {reg.confirmationCode}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${reg.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {reg.status === 'confirmed' ? '✅ Confirmado' : '⏳ Pendente'}
                        </span>
                        {reg.status === 'pending_payment' && (
                          <Link to={`/pagamento/${reg.id}`} className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-medium rounded-lg">Pagar Agora</Link>
                        )}
                        {reg.status === 'confirmed' && payment && (
                          <Link to={`/comprovante/${reg.id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"><FileText className="w-3 h-3" />Comprovante</Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Meu Perfil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500">Nome</p><p className="font-medium">{user.name}</p></div>
            <div><p className="text-xs text-gray-500">E-mail</p><p className="font-medium">{user.email}</p></div>
            <div><p className="text-xs text-gray-500">CPF</p><p className="font-medium">{user.cpf}</p></div>
            <div><p className="text-xs text-gray-500">Telefone</p><p className="font-medium">{user.phone}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ APP ============

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<><Header /><HomePage /></>} />
              <Route path="/evento/:id" element={<><Header /><RaceDetailsPage /></>} />
              <Route path="/inscricao/:id" element={<RegistrationPage />} />
              <Route path="/pagamento/:registrationId" element={<ProtectedRoute requiredRole="participant"><PaymentPage /></ProtectedRoute>} />
              <Route path="/comprovante/:registrationId" element={<ProtectedRoute requiredRole="participant"><ReceiptPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/minha-conta" element={<ProtectedRoute requiredRole="participant"><ParticipantDashboard /></ProtectedRoute>} />
              <Route path="/diagnostico" element={<DiagnosticPage />} />
              <Route path="/teste-supabase" element={<TestSupabase />} />
            </Routes>
          </ErrorBoundary>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
