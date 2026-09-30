import { supabase, isDemoMode } from './supabase';

export async function testSupabaseConnection() {
  console.log('🔍 Testando conexão com Supabase...\n');

  if (isDemoMode || !supabase) {
    console.log('⚠️  Modo DEMO ativo - Supabase não configurado');
    console.log('📝 Para usar Supabase real, configure as variáveis em .env.local');
    return { success: false, mode: 'demo' };
  }

  try {
    // Test 1: Verificar autenticação
    console.log('1️⃣  Testando autenticação...');
    const authResult = await supabase.auth.getUser();
    const authError = authResult.error;
    const user = authResult.data?.user;
    if (authError) {
      console.log('   ⚠️  Usuário não autenticado (normal se não fez login)');
    } else {
      console.log('   ✅ Autenticação OK');
      if (user) console.log(`   👤 Usuário: ${user.email}`);
    }

    // Test 2: Verificar tabelas
    console.log('\n2️⃣  Testando acesso às tabelas...');
    
    // Testar races
    const racesResult = await supabase
      .from('races')
      .select('*', { count: 'exact', head: true });
    const racesError = racesResult.error;
    const racesCount = racesResult.count;
    
    if (racesError) {
      console.log(`   ❌ Erro ao acessar races: ${racesError.message}`);
    } else {
      console.log(`   ✅ Tabela races OK (${racesCount || 0} registros)`);
    }

    // Testar profiles
    const profilesResult = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    const profilesError = profilesResult.error;
    
    if (profilesError) {
      console.log(`   ❌ Erro ao acessar profiles: ${profilesError.message}`);
    } else {
      console.log('   ✅ Tabela profiles OK');
    }

    // Test 3: Verificar storage
    console.log('\n3️⃣  Testando storage...');
    const storageResult = await supabase.storage.listBuckets();
    const buckets = storageResult.data;
    const storageError = storageResult.error;
    
    if (storageError) {
      console.log(`   ❌ Erro ao acessar storage: ${storageError.message}`);
    } else {
      const eventImagesBucket = buckets?.find(b => b.name === 'event-images');
      if (eventImagesBucket) {
        console.log('   ✅ Bucket event-images encontrado');
      } else {
        console.log('   ⚠️  Bucket event-images não encontrado (crie no dashboard)');
      }
    }

    // Test 4: Verificar Edge Functions
    console.log('\n4️⃣  Testando Edge Functions...');
    try {
      const functionsResult = await supabase.functions.invoke('mercadopago-webhook', {
        body: { test: true }
      });
      const functionsError = functionsResult.error;
      
      if (functionsError) {
        console.log(`   ⚠️  Edge Function mercadopago-webhook: ${functionsError.message}`);
      } else {
        console.log('   ✅ Edge Function mercadopago-webhook OK');
      }
    } catch (err) {
      console.log('   ⚠️  Edge Functions não deployadas ou com erro');
    }

    console.log('\n✅ Teste concluído!');
    return { success: true, mode: 'production' };

  } catch (error) {
    console.error('\n❌ Erro geral:', error);
    return { success: false, mode: 'error', error };
  }
}

// Executar teste automaticamente no console do navegador
if (typeof window !== 'undefined') {
  (window as any).testSupabase = testSupabaseConnection;
  console.log('💡 Digite testSupabase() no console para testar a conexão');
}
