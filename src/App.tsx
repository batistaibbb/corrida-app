import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { useState, ReactNode } from 'react';
import { Race, Registration, Payment } from './types';
import DiagnosticPage from './pages/DiagnosticPage';
import TestSupabase from './pages/TestSupabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Trophy, Calendar, MapPin, Users, Star, Search, Filter, 
  User, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  LogOut, LayoutDashboard, CreditCard, FileText, CheckCircle,
  QrCode, Copy, Check, Shield, Download, Plus, Edit, Trash2,
  DollarSign, AlertCircle, Phone, Home as HomeIcon
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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              RunBrasil
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <Link to="/minha-conta" className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-orange-500">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-orange-600">{user.name.charAt(0)}</span>
                  </div>
                  {user.name.split(' ')[0]}
                </Link>
                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600" title="Sair">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-orange-500">
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
  if (!user) return <Link to="/login" className="block text-center py-20 text-orange-600">Faça login para continuar →</Link>;
  if (requiredRole && user.role !== requiredRole) return <div className="text-center py-20">Acesso negado</div>;
  return <>{children}</>;
}

// ============ PAGES ============

function HomePage() {
  const { races } = useData();
  const [search, setSearch] = useState('');
  
  const filtered = races.filter(r => 
    r.status !== 'draft' && 
    (r.name.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-600 to-red-700 py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Encontre sua próxima corrida</h1>
          <p className="text-xl text-white/80 mb-8">Inscreva-se nos melhores eventos do Brasil</p>
          <div className="max-w-2xl mx-auto flex gap-2 bg-white rounded-xl p-2">
            <div className="flex-1 flex items-center gap-2 px-4">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar evento ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 focus:outline-none"
              />
            </div>
            <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg">
              Buscar
            </button>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{filtered.length} eventos encontrados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(race => (
            <Link key={race.id} to={`/evento/${race.id}`} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100">
              <div className="relative h-48">
                <img src={race.image} alt={race.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    race.status === 'open' ? 'bg-green-100 text-green-700' :
                    race.status === 'closed' ? 'bg-orange-100 text-orange-700' :
                    race.status === 'finished' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {race.status === 'open' ? 'Inscrições Abertas' :
                     race.status === 'closed' ? 'Inscrições Encerradas' :
                     race.status === 'finished' ? 'Evento Encerrado' : 'Publicado'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{race.name}</h3>
                <div className="space-y-1 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" />{format(parseISO(race.date), "dd/MM/yyyy")}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500" />{race.city}, {race.state}</div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-orange-500" />{race.participants} inscritos</div>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-lg font-bold text-orange-600">R$ {Math.min(...race.distances.map(d => d.price)).toFixed(2).replace('.', ',')}</span>
                  <div className="flex items-center gap-1 text-sm"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />{race.rating}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
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
        // Get user role from Supabase or localStorage
        const currentUser = JSON.parse(localStorage.getItem('rb_session') || 'null');
        if (currentUser) {
          navigate(currentUser.role === 'admin' ? '/admin' : '/minha-conta');
        } else {
          navigate('/minha-conta');
        }
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">{isLogin ? 'Entrar' : 'Criar Conta'}</h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <input type="text" placeholder="Nome completo" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500" required />}
          <input type="email" placeholder="E-mail" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500" required />
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {!isLogin && (
            <>
              <input type="text" placeholder="CPF" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} className="w-full px-4 py-3 border rounded-xl" required />
              <input type="tel" placeholder="Telefone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border rounded-xl" required />
            </>
          )}
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl">{isLogin ? 'Entrar' : 'Criar Conta'}</button>
        </form>

        {isLogin && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-semibold text-blue-700 mb-2">🔑 Credenciais de teste:</p>
            <p className="text-xs text-blue-600"><strong>Admin:</strong> admin@runbrasil.com.br / admin123</p>
            <p className="text-xs text-blue-600"><strong>Participante:</strong> joao@email.com / 123456</p>
          </div>
        )}

        <p className="text-center text-sm text-gray-600 mt-6">
          {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-orange-600 font-semibold">{isLogin ? 'Cadastre-se' : 'Fazer login'}</button>
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
  const race = id ? getRaceById(id) : null;

  if (!race) return <div className="text-center py-20">Evento não encontrado</div>;

  const handleRegister = () => {
    if (!user) { navigate('/login'); return; }
    if (!selectedDistance) return;
    navigate(`/inscricao/${race.id}?distance=${selectedDistance}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-80">
        <img src={race.image} alt={race.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-white">{race.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-orange-500" /><div><p className="text-xs text-gray-500">Data</p><p className="font-semibold">{format(parseISO(race.date), "dd/MM/yyyy")} às {race.time}</p></div></div>
                <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-orange-500" /><div><p className="text-xs text-gray-500">Local</p><p className="font-semibold">{race.city}, {race.state}</p></div></div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-3">Sobre o Evento</h2>
              <p className="text-gray-600">{race.description}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Distâncias e Valores</h2>
              <div className="space-y-3">
                {race.distances.map(d => (
                  <button key={d.km} onClick={() => setSelectedDistance(d.km)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selectedDistance === d.km ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                    <div><p className="font-bold">{d.km} km</p><p className="text-xs text-gray-500">{d.km <= 5 ? 'Iniciante' : d.km <= 10 ? 'Intermediário' : 'Avançado'}</p></div>
                    <p className="text-xl font-bold text-orange-600">R$ {d.price.toFixed(2).replace('.', ',')}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-20">
              <h3 className="font-bold mb-4">Inscreva-se</h3>
              {selectedDistance ? (
                <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-500">Distância selecionada</p>
                  <p className="font-bold">{selectedDistance} km</p>
                  <p className="text-2xl font-bold text-orange-600">R$ {race.distances.find(d => d.km === selectedDistance)?.price.toFixed(2).replace('.', ',')}</p>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Selecione uma distância</p>
                </div>
              )}
              <button onClick={handleRegister} disabled={!selectedDistance || race.status !== 'open'} className={`w-full py-3 rounded-xl font-semibold text-white ${selectedDistance && race.status === 'open' ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gray-300 cursor-not-allowed'}`}>
                {race.status === 'open' ? 'Realizar Inscrição' : 'Inscrições Encerradas'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistrationPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { getRaceById, addRegistration } = useData();
  const navigate = useNavigate();
  const distance = parseInt(searchParams.get('distance') || '0');
  const race = id ? getRaceById(id) : null;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', cpf: '', birthDate: '', gender: '', tshirtSize: '', address: '', city: '', state: '', zipCode: '', emergencyName: '', emergencyPhone: '', acceptTerms: false, acceptMedical: false });

  if (!race || !user) return <div className="text-center py-20">Dados inválidos</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = () => {
    const regId = addRegistration({
      userId: user.id,
      raceId: race.id,
      distance,
      tshirtSize: formData.tshirtSize,
      status: 'pending_payment',
      emergencyName: formData.emergencyName,
      emergencyPhone: formData.emergencyPhone,
    });
    navigate(`/pagamento/${regId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="font-bold">Inscrição - {race.name}</h1><p className="text-sm text-gray-500">{distance}km</p></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            {step === 1 && (
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
                  <option value="outro">Outro</option>
                </select>
                <button onClick={() => setStep(2)} disabled={!formData.firstName || !formData.email || !formData.cpf} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl disabled:opacity-50">Próximo</button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Endereço e Preferências</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Tamanho da Camiseta</label>
                  <div className="flex flex-wrap gap-2">
                    {['PP', 'P', 'M', 'G', 'GG', 'XGG'].map(size => (
                      <button key={size} type="button" onClick={() => setFormData(prev => ({ ...prev, tshirtSize: size }))} className={`px-4 py-2 rounded-lg border-2 ${formData.tshirtSize === size ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>{size}</button>
                    ))}
                  </div>
                </div>
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Endereço" className="w-full px-4 py-2.5 border rounded-lg" required />
                <div className="grid grid-cols-3 gap-4">
                  <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Cidade" className="px-4 py-2.5 border rounded-lg" required />
                  <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="UF" maxLength={2} className="px-4 py-2.5 border rounded-lg" required />
                  <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="CEP" className="px-4 py-2.5 border rounded-lg" required />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="px-6 py-3 border rounded-xl">Voltar</button>
                  <button onClick={() => setStep(3)} disabled={!formData.tshirtSize || !formData.address} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl disabled:opacity-50">Próximo</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Emergência e Termos</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleChange} placeholder="Contato de emergência" className="px-4 py-2.5 border rounded-lg" required />
                  <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} placeholder="Telefone emergência" className="px-4 py-2.5 border rounded-lg" required />
                </div>
                <label className="flex items-start gap-2"><input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} className="mt-1" /><span className="text-sm">Li e aceito os termos de uso *</span></label>
                <label className="flex items-start gap-2"><input type="checkbox" name="acceptMedical" checked={formData.acceptMedical} onChange={handleChange} className="mt-1" /><span className="text-sm">Declaro que possuo atestado médico *</span></label>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="px-6 py-3 border rounded-xl">Voltar</button>
                  <button onClick={handleSubmit} disabled={!formData.emergencyName || !formData.acceptTerms || !formData.acceptMedical} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl disabled:opacity-50">Finalizar Inscrição</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm h-fit sticky top-20">
            <h3 className="font-bold mb-4">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Evento</span><span className="font-medium">{race.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Distância</span><span className="font-medium">{distance} km</span></div>
              <div className="flex justify-between pt-3 border-t"><span className="font-bold">Total</span><span className="font-bold text-orange-600">R$ {(race.distances.find(d => d.km === distance)?.price || 0).toFixed(2).replace('.', ',')}</span></div>
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
  const { registrations, getRaceById, addPayment, updateRegistration } = useData();
  const navigate = useNavigate();
  const registration = registrations.find(r => r.id === registrationId);
  const race = registration ? getRaceById(registration.raceId) : null;
  const distancePrice = race?.distances.find(d => d.km === registration?.distance)?.price || 0;
  const serviceFee = distancePrice * 0.05;
  const total = distancePrice + serviceFee;

  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'credit_card' | 'debit_card' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pixGenerated, setPixGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '', installments: '1' });

  if (!registration || !race || !user) return <div className="text-center py-20">Dados inválidos</div>;

  const pixCode = `00020126580014br.gov.bcb.pix0136${registration.confirmationCode}520400005303986540${total.toFixed(2)}5802BR5925RUNBRASIL6009SAO PAULO6304ABCD`;

  const handlePixPayment = () => {
    setProcessing(true);
    setTimeout(() => {
      const id = addPayment({
        registrationId: registration.id,
        method: 'pix',
        amount: distancePrice,
        serviceFee,
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

  const handleCardPayment = () => {
    if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
      alert('Preencha todos os dados do cartão');
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      const method = cardData.installments === '1' ? 'debit_card' : 'credit_card';
      const id = addPayment({
        registrationId: registration.id,
        method,
        amount: distancePrice,
        serviceFee,
        total,
        status: 'approved',
        transactionId: `MP-CARD-${Date.now()}`,
        paidAt: new Date().toISOString(),
      });
      updateRegistration(registration.id, { status: 'confirmed', paymentId: id });
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
                <div className="flex justify-between"><span className="text-gray-500">Inscrição {registration.distance}km</span><span>R$ {distancePrice.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Taxa de serviço (5%)</span><span>R$ {serviceFee.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between pt-3 border-t font-bold text-lg"><span>Total</span><span className="text-orange-600">R$ {total.toFixed(2).replace('.', ',')}</span></div>
              </div>
            </div>

            {!pixGenerated ? (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="font-bold mb-4">Forma de Pagamento</h2>
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
                  <button onClick={handlePixPayment} disabled={processing} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl disabled:opacity-50">
                    {processing ? 'Gerando PIX...' : 'Gerar PIX'}
                  </button>
                )}

                {selectedMethod === 'credit_card' && (
                  <div className="space-y-3">
                    <input type="text" value={cardData.number} onChange={(e) => setCardData({...cardData, number: e.target.value})} placeholder="Número do cartão" maxLength={19} className="w-full px-4 py-3 border rounded-xl" />
                    <input type="text" value={cardData.name} onChange={(e) => setCardData({...cardData, name: e.target.value})} placeholder="Nome no cartão" className="w-full px-4 py-3 border rounded-xl" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={cardData.expiry} onChange={(e) => setCardData({...cardData, expiry: e.target.value})} placeholder="MM/AA" maxLength={5} className="px-4 py-3 border rounded-xl" />
                      <input type="text" value={cardData.cvv} onChange={(e) => setCardData({...cardData, cvv: e.target.value})} placeholder="CVV" maxLength={4} className="px-4 py-3 border rounded-xl" />
                    </div>
                    <select value={cardData.installments} onChange={(e) => setCardData({...cardData, installments: e.target.value})} className="w-full px-4 py-3 border rounded-xl">
                      <option value="1">1x de R$ {total.toFixed(2).replace('.', ',')} (sem juros)</option>
                      <option value="2">2x de R$ {(total / 2).toFixed(2).replace('.', ',')} (sem juros)</option>
                      <option value="3">3x de R$ {(total / 3).toFixed(2).replace('.', ',')} (sem juros)</option>
                      <option value="6">6x de R$ {(total / 6 * 1.05).toFixed(2).replace('.', ',')} (com juros)</option>
                      <option value="12">12x de R$ {(total / 12 * 1.12).toFixed(2).replace('.', ',')} (com juros)</option>
                    </select>
                    <button onClick={handleCardPayment} disabled={processing} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      {processing ? 'Processando...' : `Pagar R$ ${total.toFixed(2).replace('.', ',')}`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <QrCode className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Pague com PIX</h2>
                <p className="text-sm text-gray-500 mb-6">Escaneie o QR Code ou copie o código</p>
                <div className="w-56 h-56 mx-auto bg-gray-100 rounded-xl mb-6 flex items-center justify-center">
                  <div className="text-gray-400">QR Code</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Código PIX:</p>
                  <p className="text-xs font-mono break-all">{pixCode}</p>
                  <button onClick={copyPixCode} className="mt-2 text-xs text-orange-600 flex items-center gap-1 mx-auto">
                    {copied ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar código</>}
                  </button>
                </div>
                <button onClick={simulatePixApproval} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl">
                  ✅ Simular Aprovação (Demo)
                </button>
                <p className="text-xs text-gray-400 mt-2">Em produção, aprovação é automática via webhook Mercado Pago</p>
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
  const registration = registrations.find(r => r.id === registrationId);
  const race = registration ? getRaceById(registration.raceId) : null;
  const payment = registration ? getPaymentByRegistration(registration.id) : null;

  if (!registration || !race || !payment || !user) return <div className="text-center py-20">Comprovante não encontrado</div>;

  const handleDownload = () => {
    const content = `COMPROVANTE DE INSCRIÇÃO - RUNBRASIL\n\nCódigo: ${registration.confirmationCode}\n\nEVENTO\n${race.name}\nData: ${format(parseISO(race.date), "dd/MM/yyyy")}\nLocal: ${race.location}, ${race.city}/${race.state}\n\nINSCRITO\nNome: ${user.name}\nCPF: ${user.cpf}\n\nINSCRIÇÃO\nDistância: ${registration.distance}km\nCamiseta: Tam. ${registration.tshirtSize}\n\nPAGAMENTO\nMétodo: ${payment.method === 'pix' ? 'PIX' : 'Cartão'} (Mercado Pago)\nTotal: R$ ${payment.total.toFixed(2).replace('.', ',')}\nStatus: APROVADO\nTransação: ${payment.transactionId}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-${registration.confirmationCode}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            <div><h1 className="font-bold">Comprovante</h1><p className="text-sm text-gray-500">{registration.confirmationCode}</p></div>
          </div>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-sm font-medium">
            <Download className="w-4 h-4" /> Baixar
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white">Pagamento Confirmado!</h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center pb-6 border-b">
              <p className="text-xs text-gray-500 uppercase">Código de Confirmação</p>
              <p className="text-3xl font-mono font-bold">{registration.confirmationCode}</p>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-orange-500" /> Evento</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold">{race.name}</p>
                <p className="text-sm text-gray-600">{format(parseISO(race.date), "dd/MM/yyyy")} às {race.time}</p>
                <p className="text-sm text-gray-600">{race.location}, {race.city}/{race.state}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2"><User className="w-5 h-5 text-blue-500" /> Participante</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Nome</p><p className="font-medium">{user.name}</p></div>
                <div><p className="text-gray-500">CPF</p><p className="font-medium">{user.cpf}</p></div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-500" /> Pagamento</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Método</span><span className="font-medium">{payment.method === 'pix' ? 'PIX' : 'Cartão'} (Mercado Pago)</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Inscrição</span><span>R$ {payment.amount.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Taxa</span><span>R$ {payment.serviceFee.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between pt-2 border-t"><span className="font-bold">Total</span><span className="font-bold text-xl text-green-600">R$ {payment.total.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Transação</span><span className="font-mono text-xs">{payment.transactionId}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link to="/minha-conta" className="flex-1 py-3 border rounded-xl text-center font-medium">Minhas Inscrições</Link>
          <Link to="/" className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-center font-medium">Ver Mais Eventos</Link>
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
  const stats = getStats();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg"><Trophy className="w-5 h-5 text-white" /></div>
            <span className="font-bold">RunBrasil</span>
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
              <div className="bg-white rounded-xl p-6 shadow-sm"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><DollarSign className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(0)}</p><p className="text-xs text-gray-500">Receita</p></div></div></div>
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
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${race.status === 'open' ? 'bg-green-100 text-green-700' : race.status === 'closed' ? 'bg-orange-100 text-orange-700' : race.status === 'finished' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{race.status === 'open' ? 'Aberto' : race.status === 'closed' ? 'Encerrado' : race.status === 'finished' ? 'Finalizado' : 'Rascunho'}</span></td>
                      <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => { setEditingRace(race); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button><button onClick={() => { if (confirm('Excluir?')) deleteRace(race.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Inscrições</h1>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Evento</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Distância</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registrations.map(reg => {
                    const race = races.find(r => r.id === reg.raceId);
                    return (
                      <tr key={reg.id}>
                        <td className="px-6 py-4 font-mono text-sm">{reg.confirmationCode}</td>
                        <td className="px-6 py-4 text-sm">{race?.name}</td>
                        <td className="px-6 py-4 text-sm">{reg.distance}km</td>
                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${reg.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{reg.status === 'confirmed' ? 'Confirmado' : 'Pendente'}</span></td>
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
                      <td className="px-6 py-4 text-sm font-semibold">R$ {payment.total.toFixed(2).replace('.', ',')}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${payment.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{payment.status === 'approved' ? 'Aprovado' : 'Pendente'}</span></td>
                      <td className="px-6 py-4 text-right">{payment.status === 'pending' && <button onClick={() => approvePayment(payment.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="w-4 h-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showForm && user && (
        <RaceFormModal
          race={editingRace}
          organizerId={user.id}
          organizerName={user.name}
          onSave={(data) => {
            if (editingRace) updateRace(editingRace.id, data);
            else addRace(data);
            setShowForm(false);
            setEditingRace(null);
          }}
          onClose={() => { setShowForm(false); setEditingRace(null); }}
        />
      )}
    </div>
  );
}

function RaceFormModal({ race, onSave, onClose, organizerId, organizerName }: { race?: Race | null; onSave: (data: any) => void; onClose: () => void; organizerId: string; organizerName: string }) {
  const [formData, setFormData] = useState({
    name: race?.name || '',
    date: race?.date || '',
    time: race?.time || '',
    location: race?.location || '',
    city: race?.city || '',
    state: race?.state || '',
    image: race?.image || '',
    description: race?.description || '',
    organizer: organizerName,
    organizerId,
    maxParticipants: race?.maxParticipants || 1000,
    category: race?.category || 'Maratona',
    sport: race?.sport || 'corrida',
    status: race?.status || 'draft',
    includes: race?.includes || [''],
    rules: race?.rules || [''],
    featured: race?.featured || false,
    discount: race?.discount || 0,
    tags: race?.tags || [''],
    distances: race?.distances || [{ km: 5, price: 100 }],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      includes: formData.includes.filter(i => i.trim()),
      rules: formData.rules.filter(r => r.trim()),
      tags: formData.tags.filter(t => t.trim()),
      distances: formData.distances.filter(d => d.km > 0 && d.price > 0),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative min-h-screen flex items-start justify-center p-4 pt-8">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
          <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <h2 className="text-xl font-bold">{race ? 'Editar Evento' : 'Novo Evento'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nome do Evento" className="w-full px-4 py-2.5 border rounded-lg" required />
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Descrição" rows={3} className="w-full px-4 py-2.5 border rounded-lg" required />
            <input type="url" value={formData.image} onChange={(e) => setFormData({...formData, image: e.target.value})} placeholder="URL da Imagem" className="w-full px-4 py-2.5 border rounded-lg" required />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="px-4 py-2.5 border rounded-lg" required />
              <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="px-4 py-2.5 border rounded-lg" required />
            </div>
            <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Local" className="w-full px-4 py-2.5 border rounded-lg" required />
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="Cidade" className="px-4 py-2.5 border rounded-lg" required />
              <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} placeholder="UF" maxLength={2} className="px-4 py-2.5 border rounded-lg" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" value={formData.maxParticipants} onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value)})} placeholder="Vagas" className="px-4 py-2.5 border rounded-lg" required />
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} className="px-4 py-2.5 border rounded-lg">
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="open">Inscrições Abertas</option>
                <option value="closed">Inscrições Encerradas</option>
                <option value="finished">Evento Encerrado</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-6 py-2.5 border rounded-lg">Cancelar</button>
              <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg">{race ? 'Salvar' : 'Criar'}</button>
            </div>
          </form>
        </div>
      </div>
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
            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">RunBrasil</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-gray-600 hover:text-orange-600">Ver Eventos</Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" />Sair</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Olá, {user.name.split(' ')[0]}! 👋</h1>

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
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
