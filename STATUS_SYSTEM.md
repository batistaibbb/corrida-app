# Sistema de Status de Eventos - Documentação

## Visão Geral

O sistema de status foi reformulado para separar dois conceitos independentes:

1. **Status de Publicação** (`published`) - Controla a visibilidade do evento
2. **Status de Inscrição** (`registrationStatus`) - Controla o estado temporal das inscrições

## Conceitos

### Status de Publicação (Visibilidade)

Controla se o evento é visível para o público ou não.

- **`published: true`** - Evento visível para todos os usuários
- **`published: false`** - Evento visível apenas para administradores (rascunho)

### Status de Inscrição (Temporal)

Controla o estado das inscrições baseado no tempo.

- **`upcoming`** - Inscrições abertas (evento futuro)
- **`closed`** - Inscrições encerradas manualmente (evento próximo)
- **`finished`** - Evento finalizado (já aconteceu)

## Combinações Possíveis

| Published | Registration Status | Comportamento |
|-----------|---------------------|---------------|
| `false` | `upcoming` | Rascunho - Não visível, inscrições abertas (quando publicado) |
| `false` | `closed` | Rascunho - Não visível, inscrições encerradas |
| `false` | `finished` | Rascunho - Não visível, evento finalizado |
| `true` | `upcoming` | **Publicado com inscrições abertas** - Visível e aceitando inscrições |
| `true` | `closed` | **Publicado com inscrições encerradas** - Visível mas não aceita inscrições |
| `true` | `finished` | **Publicado como histórico** - Visível como evento passado |

## Casos de Uso

### 1. Criando um Novo Evento
```
published: false
registrationStatus: upcoming
```
- Evento não visível para o público
- Admin pode editar e preparar o evento
- Quando pronto, muda `published` para `true`

### 2. Evento em Andamento
```
published: true
registrationStatus: upcoming
```
- Evento visível para o público
- Inscrições abertas
- Usuários podem se inscrever

### 3. Encerrando Inscrições Manualmente
```
published: true
registrationStatus: closed
```
- Evento ainda visível para o público
- Inscrições encerradas (limite atingido ou decisão do organizador)
- Usuários podem ver detalhes mas não se inscrever

### 4. Evento Finalizado
```
published: true
registrationStatus: finished
```
- Evento visível como histórico
- Mostra que o evento já aconteceu
- Útil para portfólio ou referência

### 5. Despublicando Evento
```
published: false
registrationStatus: (qualquer)
```
- Evento não visível para o público
- Admin ainda pode ver e editar
- Útil para eventos problemáticos ou em revisão

## Interface do Admin

### Tabela de Eventos

A tabela mostra dois badges:
1. **Badge de Publicação**: "Publicado" (verde) ou "Rascunho" (cinza)
2. **Badge de Inscrição**: "Inscrições Abertas" / "Inscrições Encerradas" / "Evento Finalizado"

### Botões de Ação

1. **Editar** (ícone lápis) - Abre modal de edição
2. **Publicar/Despublicar** (ícone olho) - Alterna `published`
3. **Encerrar/Reabrir Inscrições** (ícone cadeado) - Alterna `registrationStatus` entre `upcoming` e `closed`
4. **Excluir** (ícone lixeira) - Remove o evento permanentemente

### Modal de Edição

O formulário tem dois selects separados:

**Publicação:**
- Rascunho (não publicado)
- Publicado

**Status das Inscrições:**
- Inscrições Abertas
- Inscrições Encerradas
- Evento Finalizado

## Interface Pública

### Página Inicial

- Mostra apenas eventos com `published: true`
- Exibe badge com status de inscrição
- Botão de inscrição habilitado apenas se `registrationStatus: upcoming`

### Página de Detalhes

- Visível apenas se `published: true`
- Mostra status de inscrição no topo
- Botão de inscrição:
  - Habilitado se `registrationStatus: upcoming`
  - Desabilitado com mensagem apropriada se `closed` ou `finished`

## Funções Helper

### `getRegistrationStatus(race)`
Determina o status de inscrição baseado na data e no campo `registrationStatus`.

```typescript
function getRegistrationStatus(race: Race): 'upcoming' | 'closed' | 'finished'
```

### `isEventVisible(race)`
Verifica se o evento está visível para o público.

```typescript
function isEventVisible(race: Race): boolean
```

### `canRegister(race)`
Verifica se é possível se inscrever no evento.

```typescript
function canRegister(race: Race): boolean
```

### `getRegistrationStatusText(status)`
Retorna o texto do status de inscrição.

```typescript
function getRegistrationStatusText(status: 'upcoming' | 'closed' | 'finished'): string
```

### `getRegistrationStatusColor(status)`
Retorna a cor do status de inscrição.

```typescript
function getRegistrationStatusColor(status: 'upcoming' | 'closed' | 'finished'): string
```

## Migração de Dados

Para migrar dados existentes, execute o script:
```
supabase/migrations/002_status_migration.sql
```

O script:
1. Adiciona os novos campos `published` e `registration_status`
2. Converte o campo `status` antigo para os novos campos
3. Cria índices para performance
4. (Opcional) Remove o campo `status` antigo

## Exemplos de Código

### Verificar se pode mostrar evento
```typescript
if (race.published) {
  // Mostrar evento
}
```

### Verificar se pode inscrever
```typescript
if (canRegister(race)) {
  // Mostrar botão de inscrição
}
```

### Mostrar status na interface
```typescript
const status = getRegistrationStatus(race);
const text = getRegistrationStatusText(status);
const color = getRegistrationStatusColor(status);

<span className={`px-3 py-1 rounded ${color}`}>
  {text}
</span>
```

## Vantagens do Novo Sistema

1. **Separação de Concerns**: Publicação e inscrições são independentes
2. **Flexibilidade**: Permite combinações como "publicado mas com inscrições encerradas"
3. **Clareza**: Admin vê claramente o estado de publicação e inscrições
4. **Histórico**: Eventos finalizados podem permanecer publicados como histórico
5. **Controle Granular**: Admin pode controlar cada aspecto independentemente

## Fluxo Típico de um Evento

```
1. Criar evento
   published: false, registrationStatus: upcoming

2. Preparar e revisar
   published: false, registrationStatus: upcoming

3. Publicar evento
   published: true, registrationStatus: upcoming

4. Inscrições abertas
   published: true, registrationStatus: upcoming

5. Limite atingido ou data próxima
   published: true, registrationStatus: closed

6. Evento acontece
   published: true, registrationStatus: finished

7. (Opcional) Despublicar após algum tempo
   published: false, registrationStatus: finished
```

## Considerações de UX

- **Usuário vê**: Badge colorido indicando status de inscrição
- **Admin vê**: Dois badges separados (publicação + inscrição)
- **Botões de ação**: Ícones claros com tooltips explicativos
- **Confirmações**: Modais de confirmação para ações destrutivas

## Próximos Passos

- [ ] Implementar notificações automáticas quando evento muda de status
- [ ] Adicionar campo de "data limite de inscrição" automático
- [ ] Implementar lista de espera quando inscrições encerram
- [ ] Adicionar opção de "evento cancelado" como status separado
- [ ] Implementar arquivamento automático de eventos antigos
