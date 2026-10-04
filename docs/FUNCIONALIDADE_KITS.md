# 🎁 Funcionalidade de Kits e Tamanhos de Camisa

## ✅ Implementação Concluída

Adicionei suporte completo para **kits de inscrição com imagens** e **seleção de tamanhos de camisa** na plataforma Smart Brasil Ticket.

---

## 📋 O que foi implementado

### 1. **Modelo de Dados Atualizado**

#### Nova Interface `RaceKit`
```typescript
export interface RaceKit {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  includes: string[];
  distance?: number; // km (0 para caminhada)
}
```

#### Interface `Race` Atualizada
- ✅ Adicionado campo `kits?: RaceKit[]`
- ✅ Adicionado campo `shirtSizes?: string[]`

#### Interface `Registration` Atualizada
- ✅ Adicionado campo `kitId?: string`
- ✅ Adicionado campo `kitName?: string`

---

### 2. **Tela de Inscrição (RegistrationPage)**

#### Novo Fluxo de 4 Passos:

**Passo 1: Escolha seu Kit**
- ✅ Exibe todos os kits disponíveis com imagens
- ✅ Cada kit mostra:
  - Imagem do kit
  - Nome e descrição
  - Lista de itens inclusos
  - Preço
  - Distância (se aplicável)
- ✅ Seleção visual com destaque verde

**Passo 2: Dados Pessoais**
- Nome, sobrenome, email, telefone
- CPF, data de nascimento, gênero

**Passo 3: Tamanho e Endereço**
- ✅ **Tamanho da camisa** (apenas se o kit incluir camisa)
  - Mostra apenas os tamanhos cadastrados pelo admin
  - Tamanhos padrão: PP, P, M, G, GG, XGG
- Endereço completo (rua, cidade, UF, CEP)

**Passo 4: Emergência e Termos**
- Contato de emergência
- Aceite dos termos e atestado médico

#### Resumo Lateral
- ✅ Mostra kit selecionado com imagem
- ✅ Mostra distância (se aplicável)
- ✅ Mostra tamanho da camisa selecionado
- ✅ Mostra valor total

---

### 3. **Página de Detalhes do Evento (RaceDetailsPage)**

#### Seção "Escolha seu Kit"
- ✅ Exibe kits em grid 2 colunas
- ✅ Cada kit mostra:
  - Imagem grande (400x300)
  - Nome e descrição
  - Lista de itens inclusos
  - Preço (com desconto se aplicável)
  - Badge de distância (se > 0)
- ✅ Fallback para distâncias antigas se não houver kits

---

### 4. **Painel Admin (RaceFormModal)**

#### Nova Seção: Kits de Inscrição
- ✅ Lista de kits com formulário para cada um
- ✅ Campos por kit:
  - Nome do kit
  - Descrição
  - URL da imagem
  - Preço
  - Distância (km)
  - Itens inclusos (separados por vírgula)
- ✅ Botão para adicionar/remover kits
- ✅ Preview visual dos kits

#### Nova Seção: Tamanhos de Camisa
- ✅ Campo de texto para tamanhos disponíveis
- ✅ Formato: "PP, P, M, G, GG, XGG"
- ✅ Separação por vírgula
- ✅ Tamanhos padrão pré-preenchidos

---

### 5. **Banco de Dados Supabase**

#### Novas Colunas na Tabela `races`
- ✅ `kits` (JSONB) - Lista de kits disponíveis
- ✅ `shirt_sizes` (JSONB) - Tamanhos de camisa disponíveis

#### Novas Colunas na Tabela `registrations`
- ✅ `kit_id` (TEXT) - ID do kit selecionado
- ✅ `kit_name` (TEXT) - Nome do kit selecionado

---

## 🚀 Como Usar

### **Para o Admin:**

#### 1. Criar Evento com Kits

1. Acesse o painel admin
2. Clique em "Novo Evento"
3. Preencha os dados básicos do evento
4. Na seção **"Kits de Inscrição"**:
   - Clique em "+ Adicionar Kit"
   - Preencha:
     - **Nome:** Ex: "Kit 1 - Completo"
     - **Descrição:** Ex: "Medalha + Camisa + Viseira"
     - **URL da Imagem:** Link da imagem do kit
     - **Preço:** 70.00
     - **Distância:** 4 (ou 0 para caminhada)
     - **Incluso:** "Medalha, Camisa, Viseira"
   - Repita para cada kit
5. Na seção **"Tamanhos de Camisa"**:
   - Digite os tamanhos: "PP, P, M, G, GG, XGG"
6. Clique em "Criar"

#### 2. Editar Evento Existente

1. No painel admin, clique no ícone de lápis (editar)
2. Adicione/edit kits na seção correspondente
3. Ajuste os tamanhos de camisa se necessário
4. Clique em "Salvar"

---

### **Para o Participante:**

#### 1. Visualizar Evento

1. Acesse a página inicial
2. Clique no evento desejado
3. Veja os kits disponíveis com imagens
4. Escolha o kit desejado

#### 2. Realizar Inscrição

1. Clique em "Realizar Inscrição"
2. **Passo 1:** Escolha o kit (com imagem)
3. **Passo 2:** Preencha dados pessoais
4. **Passo 3:** 
   - Selecione o tamanho da camisa (se o kit incluir)
   - Preencha endereço
5. **Passo 4:** 
   - Adicione contato de emergência
   - Aceite os termos
6. Clique em "Finalizar Inscrição"
7. Prossiga para o pagamento

---

## 📊 Exemplo: Evento "Mulheres em Movimento"

### Kits Configurados:

**Kit 1 - Completo (R$ 70,00)**
- Imagem: Foto do kit completo
- Inclui: Medalha, Camisa, Viseira
- Distância: 4km (corrida)

**Kit 2 - Medalha + Camisa (R$ 50,00)**
- Imagem: Foto do kit
- Inclui: Medalha, Camisa
- Distância: 4km (corrida)

**Kit 3 - Medalha + Viseira (R$ 35,00)**
- Imagem: Foto do kit
- Inclui: Medalha, Viseira
- Distância: 0km (caminhada)

### Tamanhos Disponíveis:
PP, P, M, G, GG, XGG

---

## 🔧 SQL para Configurar o Evento

Execute no **Supabase SQL Editor**:

```sql
-- Atualizar o evento "Mulheres em Movimento" com kits
UPDATE races
SET 
  kits = '[
    {
      "id": "kit-1",
      "name": "Kit 1 - Completo",
      "description": "Medalha + Camisa + Viseira",
      "price": 70.00,
      "image": "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=400&h=300&fit=crop",
      "includes": ["Medalha de participação", "Camisa exclusiva", "Viseira personalizada"],
      "distance": 4
    },
    {
      "id": "kit-2",
      "name": "Kit 2 - Medalha + Camisa",
      "description": "Medalha + Camisa",
      "price": 50.00,
      "image": "https://images.unsplash.com/photo-1579120399252-4b959c3d4d7d?w=400&h=300&fit=crop",
      "includes": ["Medalha de participação", "Camisa exclusiva"],
      "distance": 4
    },
    {
      "id": "kit-3",
      "name": "Kit 3 - Medalha + Viseira",
      "description": "Medalha + Viseira",
      "price": 35.00,
      "image": "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=300&fit=crop",
      "includes": ["Medalha de participação", "Viseira personalizada"],
      "distance": 0
    }
  ]'::jsonb,
  shirt_sizes = '["PP", "P", "M", "G", "GG", "XGG"]'::jsonb
WHERE name LIKE '%Mulheres em Movimento%';
```

---

## 🎨 Interface Visual

### Tela de Seleção de Kit

```
┌─────────────────────────────────────────┐
│  Escolha seu Kit                        │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐   │
│  │   [IMAGEM]   │  │   [IMAGEM]   │   │
│  │              │  │              │   │
│  │ Kit 1        │  │ Kit 2        │   │
│  │ Completo     │  │ Medalha +    │   │
│  │              │  │ Camisa       │   │
│  │ ✓ Medalha    │  │ ✓ Medalha    │   │
│  │ ✓ Camisa     │  │ ✓ Camisa     │   │
│  │ ✓ Viseira    │  │              │   │
│  │              │  │              │   │
│  │ R$ 70,00     │  │ R$ 50,00     │   │
│  │ [4km]        │  │ [4km]        │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ┌──────────────┐                      │
│  │   [IMAGEM]   │                      │
│  │              │                      │
│  │ Kit 3        │                      │
│  │ Medalha +    │                      │
│  │ Viseira      │                      │
│  │              │                      │
│  │ ✓ Medalha    │                      │
│  │ ✓ Viseira    │                      │
│  │              │                      │
│  │ R$ 35,00     │                      │
│  │ [Caminhada]  │                      │
│  └──────────────┘                      │
└─────────────────────────────────────────┘
```

### Tela de Seleção de Tamanho

```
┌─────────────────────────────────────────┐
│  Tamanho da Camiseta *                  │
├─────────────────────────────────────────┤
│  [ PP ] [ P ] [ M ] [ G ] [ GG ] [XGG] │
│                                         │
│  Tamanho selecionado: M (destaque verde)│
└─────────────────────────────────────────┘
```

---

## 📝 Arquivos Modificados

1. **`src/types/index.ts`**
   - Adicionada interface `RaceKit`
   - Atualizada interface `Race` com `kits` e `shirtSizes`
   - Atualizada interface `Registration` com `kitId` e `kitName`

2. **`src/contexts/DataContext.tsx`**
   - Atualizada função `convertRaceFromSupabase` para incluir kits e shirtSizes
   - Atualizada função `convertRegistrationFromSupabase` para incluir kitId e kitName
   - Atualizada função `addRace` para salvar kits e shirtSizes
   - Atualizada função `updateRace` para atualizar kits e shirtSizes
   - Atualizada função `addRegistration` para salvar kitId e kitName

3. **`src/App.tsx`**
   - Reescrita `RegistrationPage` com novo fluxo de 4 passos
   - Adicionada seleção de kit com imagens
   - Adicionada seleção de tamanho de camisa condicional
   - Atualizada `RaceDetailsPage` para mostrar kits
   - Atualizado `RaceFormModal` para permitir cadastro de kits e tamanhos

4. **`ADD_KITS_AND_SIZES.sql`**
   - Script SQL para adicionar colunas no Supabase
   - Script para atualizar evento "Mulheres em Movimento" com kits

---

## ✅ Checklist de Implementação

- [x] Modelo de dados atualizado (types/index.ts)
- [x] DataContext atualizado para suportar kits
- [x] Tela de inscrição com seleção de kit
- [x] Tela de inscrição com seleção de tamanho
- [x] Página de detalhes mostrando kits
- [x] Painel admin com cadastro de kits
- [x] Painel admin com cadastro de tamanhos
- [x] SQL para criar colunas no Supabase
- [x] SQL para atualizar evento "Mulheres em Movimento"
- [x] Build realizado com sucesso

---

## 🚀 Próximos Passos

### 1. Executar SQL no Supabase

```bash
# Copie o conteúdo de ADD_KITS_AND_SIZES.sql
# Cole no SQL Editor do Supabase
# Execute
```

### 2. Fazer Push das Alterações

```bash
git add .
git commit -m "Adicionar suporte a kits com imagens e seleção de tamanhos de camisa"
git push origin main
```

### 3. Testar o Fluxo Completo

1. Acesse o site após o deploy
2. Faça login como admin
3. Crie um evento com kits
4. Faça logout
5. Faça login como participante
6. Realize uma inscrição selecionando kit e tamanho
7. Verifique se tudo funciona corretamente

---

## 🎯 Resultado Final

A plataforma agora suporta:

✅ **Kits com imagens** - Participantes veem fotos dos kits antes de escolher
✅ **Seleção de tamanho** - Tamanhos cadastrados pelo admin
✅ **Fluxo intuitivo** - 4 passos claros e organizados
✅ **Resumo visual** - Mostra kit, tamanho e valor total
✅ **Admin completo** - Cadastro fácil de kits e tamanhos
✅ **Banco de dados** - Estrutura atualizada no Supabase

**A plataforma está pronta para o primeiro evento oficial!** 🎉
