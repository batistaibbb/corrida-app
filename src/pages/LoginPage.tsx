import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
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
import { Eye, EyeOff, Trophy } from 'lucide-react';
import { maskPhone } from '../utils/documents';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();
  // Auditoria UX P2: destino original em ?from= - apos autenticar, o usuario
  // volta ao ponto onde estava (ex.: inscricao iniciada) em vez de /minha-conta.
  const location = useLocation();
  const fromParam = new URLSearchParams(location.search).get('from');
  // P2: valida com whitelist de prefixos legítimos (open-redirect guard reforçado).
  const SAFE_REDIRECT_PREFIXES = ['/inscricao/', '/evento/', '/pagamento/', '/comprovante/', '/minha-conta'];
  const isSafeRedirect = !!fromParam && SAFE_REDIRECT_PREFIXES.some(p => fromParam.startsWith(p));
  // CPF removido do cadastro (dado sensível + validação vinha bloqueando novos
  // cadastros). O campo não é mais coletado em lugar nenhum do fluxo.
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        // Wait a bit for user context to update, then redirect based on role
        setTimeout(() => {
          const currentUser = JSON.parse(localStorage.getItem('rb_session') || 'null');
          // P2: fluxo iniciado antes do login tem prioridade sobre o destino padrao.
          if (isSafeRedirect && (!currentUser || currentUser.role !== 'admin')) {
            navigate(fromParam!, { replace: true });
            return;
          }
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
      const result = await register({
        ...formData,
        cpf: '',
        phone: formData.phone ? maskPhone(formData.phone) : '',
        role: 'participant',
      });
      if (result.success) navigate(isSafeRedirect ? fromParam! : '/minha-conta', { replace: isSafeRedirect });
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
          {!isLogin && (
            <p className="text-xs text-slate-500 mt-2">
              Campos marcados com <span className="text-rose-600 font-semibold">*</span> são obrigatórios.
              Os demais são opcionais.
            </p>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo <span className="text-rose-600">*</span></label>
              <input type="text" autoComplete="name" placeholder="Nome completo" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail <span className="text-rose-600">*</span></label>
            <input type="email" autoComplete="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value.trim()})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha <span className="text-rose-600">*</span></label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required minLength={isLogin ? undefined : 6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone <span className="text-rose-600">*</span></label>
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={formData.phone} onChange={(e) => setFormData({...formData, phone: maskPhone(e.target.value)})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
              </div>
            </>
          )}
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-sky-700 transition-all">{isLogin ? 'Entrar' : 'Criar Conta'}</button>
        </form>

        {isDemoMode && isLogin && (
          <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-xl">
            <p className="text-xs font-semibold text-sky-700 mb-2">Credenciais de teste (modo demo):</p>
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
