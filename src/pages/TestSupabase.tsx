import { supabase, isDemoMode } from '../lib/supabase';

export default function TestSupabase() {
  const testConnection = async () => {
    console.log('=== TESTE DE CONEXÃO SUPABASE ===');
    console.log('1. Variáveis de ambiente:');
    console.log('   VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('   VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado');
    
    console.log('\n2. Status do Supabase:');
    console.log('   isDemoMode:', isDemoMode);
    console.log('   supabase client:', supabase ? 'Criado' : 'Não criado');
    
    if (supabase) {
      console.log('\n3. Testando conexão...');
      try {
        const { data, error } = await supabase.from('profiles').select('count');
        if (error) {
          console.error('❌ Erro:', error);
        } else {
          console.log('✅ Conexão OK! Perfis:', data);
        }
      } catch (err) {
        console.error('❌ Erro na conexão:', err);
      }
      
      console.log('\n4. Testando Auth...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('❌ Erro Auth:', error);
        } else {
          console.log('✅ Auth OK! Session:', session ? 'Ativa' : 'Inativa');
        }
      } catch (err) {
        console.error('❌ Erro no Auth:', err);
      }
    } else {
      console.log('\n⚠️ Supabase não está configurado. Verifique as variáveis de ambiente na Vercel.');
    }
    
    console.log('\n=== FIM DO TESTE ===');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Teste de Conexão Supabase</h1>
          
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h2 className="font-semibold text-blue-900 mb-2">📊 Status Atual</h2>
              <ul className="space-y-1 text-sm text-blue-800">
                <li><strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado'}</li>
                <li><strong>VITE_SUPABASE_ANON_KEY:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado'}</li>
                <li><strong>Modo:</strong> {isDemoMode ? '⚠️ DEMO (localStorage)' : '✅ PRODUÇÃO (Supabase)'}</li>
                <li><strong>Cliente Supabase:</strong> {supabase ? '✅ Criado' : '❌ Não criado'}</li>
              </ul>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h2 className="font-semibold text-yellow-900 mb-2">⚠️ Se estiver em MODO DEMO</h2>
              <p className="text-sm text-yellow-800 mb-2">
                Isso significa que as variáveis de ambiente não estão sendo carregadas corretamente.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                <li>Verifique na Vercel se as variáveis estão configuradas</li>
                <li>Confirme que os nomes começam com <code className="bg-yellow-100 px-1 rounded">VITE_</code></li>
                <li>Faça um novo deploy após adicionar as variáveis</li>
              </ol>
            </div>
          </div>
          
          <button
            onClick={testConnection}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-700 transition-all"
          >
            🔍 Testar Conexão (Ver Console)
          </button>
          
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h2 className="font-semibold text-gray-900 mb-2">📝 Instruções</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Clique no botão acima para testar a conexão</li>
              <li>Abra o Console do navegador (F12)</li>
              <li>Copie os logs e me envie</li>
              <li>Isso vai nos ajudar a identificar o problema</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
