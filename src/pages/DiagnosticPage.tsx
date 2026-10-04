import { useState, useEffect } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
}

export default function DiagnosticPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Environment Variables
    await addResult('Variáveis de Ambiente', async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        return { status: 'error' as const, message: 'Variáveis não configuradas' };
      }
      return { status: 'success' as const, message: 'Variáveis configuradas' };
    });

    // Test 2: Supabase Connection
    await addResult('Conexão Supabase', async () => {
      if (isDemoMode || !supabase) {
        return { status: 'warning' as const, message: 'Modo demo ativo' };
      }
      return { status: 'success' as const, message: 'Conectado ao Supabase' };
    });

    // Test 3: Authentication
    await addResult('Autenticação', async () => {
      if (!supabase) return { status: 'warning' as const, message: 'Modo demo' };
      
      const result = await supabase.auth.getUser();
      if (result.error) {
        return { status: 'warning' as const, message: 'Usuário não autenticado' };
      }
      return { status: 'success' as const, message: result.data.user ? `Logado: ${result.data.user.email}` : 'Sistema OK' };
    });

    // Test 4: Database Tables
    await addResult('Tabelas do Banco', async () => {
      if (!supabase) return { status: 'warning' as const, message: 'Modo demo' };
      
      const result = await supabase.from('races').select('*', { count: 'exact', head: true });
      if (result.error) {
        return { status: 'error' as const, message: `Erro: ${result.error.message}` };
      }
      return { status: 'success' as const, message: `${result.count || 0} eventos encontrados` };
    });

    // Test 5: Storage
    await addResult('Storage (Bucket)', async () => {
      if (!supabase) return { status: 'warning' as const, message: 'Modo demo' };
      
      const result = await supabase.storage.listBuckets();
      if (result.error) {
        return { status: 'error' as const, message: `Erro: ${result.error.message}` };
      }
      const bucket = result.data?.find(b => b.name === 'event-images');
      if (!bucket) {
        return { status: 'warning' as const, message: 'Bucket event-images não encontrado' };
      }
      return { status: 'success' as const, message: 'Bucket encontrado' };
    });

    // Test 6: Edge Functions
    await addResult('Edge Functions', async () => {
      if (!supabase) return { status: 'warning' as const, message: 'Modo demo' };
      
      try {
        const result = await supabase.functions.invoke('mercadopago-webhook', {
          body: { test: true }
        });
        if (result.error) {
          return { status: 'warning' as const, message: 'Função não deployada' };
        }
        return { status: 'success' as const, message: 'Função respondendo' };
      } catch (err) {
        return { status: 'error' as const, message: 'Erro ao conectar' };
      }
    });

    setTesting(false);
  };

  const addResult = async (name: string, test: () => Promise<{ status: 'success' | 'error' | 'warning'; message: string }>) => {
    setResults(prev => [...prev, { name, status: 'loading', message: 'Testando...' }]);
    
    try {
      const result = await test();
      setResults(prev => prev.map(r => r.name === name ? { ...r, ...result } : r));
    } catch (err) {
      setResults(prev => prev.map(r => r.name === name ? { ...r, status: 'error' as const, message: 'Erro inesperado' } : r));
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'loading': return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'loading': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const allSuccess = results.every(r => r.status === 'success' || r.status === 'warning');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Diagnóstico do Sistema</h1>
            <p className="text-gray-600">Verificando todas as integrações</p>
          </div>

          <div className="space-y-4 mb-8">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 ${getStatusColor(result.status)} transition-all`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{result.name}</h3>
                    <p className="text-sm text-gray-600">{result.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {results.length > 0 && !testing && (
            <div className={`p-6 rounded-xl ${allSuccess ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
              <div className="flex items-center gap-3">
                {allSuccess ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <h2 className="text-xl font-bold text-green-900">✅ Tudo OK!</h2>
                      <p className="text-green-700">Todas as integrações estão funcionando</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <div>
                      <h2 className="text-xl font-bold text-red-900">❌ Problemas Detectados</h2>
                      <p className="text-red-700">Algumas integrações precisam de atenção</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={runTests}
              disabled={testing}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
            >
              {testing ? 'Testando...' : 'Testar Novamente'}
            </button>
            <a
              href="/"
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 text-center"
            >
              Voltar ao Início
            </a>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              💡 <strong>Dica:</strong> Você também pode testar no console do navegador (F12) digitando <code className="bg-blue-100 px-2 py-0.5 rounded">testSupabase()</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
