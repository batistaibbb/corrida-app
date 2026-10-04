# Sincronização de Dados - Problema e Solução

## Problema Identificado

O sistema está usando **localStorage** como banco de dados em modo demo. Isso causa um problema de sincronização:

### Como Funciona Atualmente

1. **Admin faz uma alteração** → Dados são salvos no localStorage do navegador do admin
2. **Usuário comum acessa** → Vê os dados do localStorage do navegador dele (desatualizados)
3. **Resultado** → As alterações do admin não são refletidas para outros usuários

### Por Que Isso Acontece?

O **localStorage é específico por navegador/dispositivo**. Cada navegador tem seu próprio localStorage isolado. Não há sincronização automática entre diferentes navegadores ou dispositivos.

```
Admin (navegador A)          Usuário (navegador B)
    ↓                            ↓
localStorage A               localStorage B
    ↓                            ↓
[dados atualizados]          [dados antigos]
```

## Solução Temporária (Modo Demo)

### 1. Sincronização Manual

Adicionei um **botão de sincronização** (ícone de refresh) na página principal. O usuário pode clicar nele para forçar o reload dos dados do localStorage.

**Limitação**: Isso só funciona se o admin e o usuário estiverem no **mesmo navegador/dispositivo**.

### 2. Sincronização Entre Abas

Adicionei um listener que sincroniza automaticamente quando há mudanças no localStorage **entre abas do mesmo navegador**.

**Limitação**: Só funciona entre abas do mesmo navegador, não entre dispositivos diferentes.

## Solução Definitiva (Produção)

Para resolver definitivamente este problema, é necessário migrar do localStorage para o **Supabase** como banco de dados centralizado.

### Arquitetura com Supabase

```
Admin (navegador A)          Usuário (navegador B)
    ↓                            ↓
    └──────────┬─────────────────┘
               ↓
         Supabase Database
               ↓
    ┌──────────┴─────────────────┐
    ↓                            ↓
[dados atualizados]          [dados atualizados]
```

### Passos para Migrar para Supabase

#### 1. Criar Tabelas no Supabase

Execute o script SQL no Supabase SQL Editor:

```sql
-- Tabela de eventos
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  organizer_id UUID REFERENCES auth.users(id),
  organizer_name TEXT,
  participants_count INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 1000,
  category TEXT NOT NULL,
  sport TEXT NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  registration_status TEXT DEFAULT 'upcoming',
  includes JSONB DEFAULT '[]',
  rules JSONB DEFAULT '[]',
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  discount INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  distances JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Realtime
ALTER TABLE races REPLICA IDENTITY FULL;
```

#### 2. Atualizar DataContext para Usar Supabase

Substituir o localStorage por chamadas ao Supabase:

```typescript
// Carregar dados do Supabase
const loadRaces = async () => {
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao carregar eventos:', error);
    return;
  }
  
  setRaces(data || []);
};

// Atualizar evento no Supabase
const updateRace = async (id: string, data: Partial<Race>) => {
  const { error } = await supabase
    .from('races')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao atualizar evento:', error);
    return;
  }
  
  // Recarregar dados
  await loadRaces();
};
```

#### 3. Habilitar Realtime (Opcional mas Recomendado)

O Supabase suporta **Realtime**, que notifica automaticamente quando há mudanças no banco de dados:

```typescript
// Subscrever para mudanças em tempo real
useEffect(() => {
  const subscription = supabase
    .channel('races-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'races' },
      (payload) => {
        console.log('Mudança detectada:', payload);
        loadRaces(); // Recarregar dados
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(subscription);
  };
}, []);
```

#### 4. Migrar Dados Existentes

Se já houver dados no localStorage, crie um script para migrá-los para o Supabase:

```typescript
const migrateFromLocalStorage = async () => {
  const storedRaces = localStorage.getItem('rb_races');
  if (!storedRaces) return;
  
  const races = JSON.parse(storedRaces);
  
  for (const race of races) {
    const { error } = await supabase
      .from('races')
      .insert(race);
    
    if (error) {
      console.error('Erro ao migrar evento:', error);
    }
  }
  
  console.log('Migração concluída!');
};
```

## Comparação: localStorage vs Supabase

| Aspecto | localStorage | Supabase |
|---------|--------------|----------|
| **Sincronização** | ❌ Não sincroniza entre dispositivos | ✅ Sincroniza em tempo real |
| **Persistência** | ⚠️ Pode ser limpo pelo usuário | ✅ Persistente no servidor |
| **Escalabilidade** | ❌ Limitado ao navegador | ✅ Escala com o aplicativo |
| **Segurança** | ❌ Dados visíveis no cliente | ✅ Controle de acesso no servidor |
| **Backup** | ❌ Sem backup automático | ✅ Backup automático |
| **Multi-usuário** | ❌ Cada usuário vê dados diferentes | ✅ Todos veem os mesmos dados |
| **Custo** | ✅ Gratuito | ⚠️ Gratuito até certo limite |

## Recomendação

### Para Desenvolvimento/Testes
- ✅ Continue usando localStorage
- ✅ Use o botão de sincronização manual
- ✅ Teste em um único navegador/dispositivo

### Para Produção
- ✅ **Migre para Supabase** (ou outro banco de dados)
- ✅ Habilite Realtime para atualizações automáticas
- ✅ Implemente autenticação e controle de acesso
- ✅ Configure backup automático

## Próximos Passos

1. **Decidir**: Manter localStorage (demo) ou migrar para Supabase (produção)?
2. **Se migrar**:
   - Criar tabelas no Supabase
   - Atualizar DataContext para usar Supabase
   - Habilitar Realtime (opcional)
   - Migrar dados existentes
   - Testar thoroughly
3. **Se manter localStorage**:
   - Documentar a limitação
   - Adicionar aviso para usuários
   - Considerar botão de "exportar/importar dados" para backup

## Código de Exemplo: Migração para Supabase

Veja o arquivo `src/contexts/DataContext.supabase.ts` para um exemplo completo de como seria o DataContext usando Supabase ao invés de localStorage.

## Conclusão

O problema de sincronização é uma **limitação fundamental do localStorage**. Para ter um sistema multi-usuário funcional, é **necessário usar um banco de dados centralizado** como Supabase, Firebase, ou outro serviço similar.

O botão de sincronização manual é uma **solução temporária** que funciona apenas para testes em um único dispositivo.
