# 🎨 Guia de Implementação - Novos Componentes de UX/UI

## ✅ Componentes Criados

### 1. **ImageUpload** (`src/components/ImageUpload.tsx`)
Componente de upload de imagens com preview e validação.

**Características:**
- ✅ Upload com preview da imagem
- ✅ Indicação de dimensões ideais
- ✅ Validação de tipo e tamanho (máx 5MB)
- ✅ Feedback visual durante upload
- ✅ Suporte a PNG, JPG, WEBP

**Uso:**
```tsx
import ImageUpload from './components/ImageUpload';

<ImageUpload
  value={formData.image}
  onChange={(url) => setFormData({...formData, image: url})}
  label="Imagem Principal do Evento"
  recommendedWidth={1200}
  recommendedHeight={630}
  aspectRatio="16:9"
/>
```

---

### 2. **PdfUpload** (`src/components/PdfUpload.tsx`)
Componente de upload de PDFs com preview e download.

**Características:**
- ✅ Upload de PDFs até 10MB
- ✅ Preview com botões "Visualizar" e "Baixar"
- ✅ Feedback visual durante upload
- ✅ Botão para remover PDF

**Uso:**
```tsx
import PdfUpload from './components/PdfUpload';

<PdfUpload
  value={formData.regulationPdf}
  onChange={(url) => setFormData({...formData, regulationPdf: url})}
  label="Regulamento do Evento (PDF)"
/>
```

---

### 3. **EventPreview** (`src/components/EventPreview.tsx`)
Preview em tempo real do evento.

**Características:**
- ✅ Visualização instantânea do evento
- ✅ Atualização automática conforme preenche
- ✅ Layout similar à página pública
- ✅ Destaque de kits, distâncias e preços

**Uso:**
```tsx
import EventPreview from './components/EventPreview';

<EventPreview data={formData} />
```

---

### 4. **DragDropList** (`src/components/DragDropList.tsx`)
Lista com drag & drop para reordenar itens.

**Características:**
- ✅ Arrastar e soltar para reordenar
- ✅ Feedback visual durante drag
- ✅ Botão de remover item
- ✅ Suporte a qualquer tipo de dado

**Uso:**
```tsx
import DragDropList from './components/DragDropList';

<DragDropList
  items={formData.kits}
  onReorder={(kits) => setFormData({...formData, kits})}
  onRemove={(index) => handleRemoveKit(index)}
  renderItem={(kit, index) => (
    <div>
      {/* Conteúdo do kit */}
    </div>
  )}
/>
```

---

### 5. **EventForm** (`src/components/EventForm.tsx`)
Formulário completo de criação de eventos com wizard de 5 passos.

**Características:**
- ✅ Wizard com 5 passos (Básico, Detalhes, Distâncias, Kits, Publicar)
- ✅ Preview em tempo real
- ✅ Validação de campos por passo
- ✅ Upload de imagens e PDFs integrado
- ✅ Drag & drop para distâncias e kits
- ✅ Vinculação de kits a distâncias

**Passos:**
1. **Básico**: Nome, data, local, imagem principal
2. **Detalhes**: Descrição, organizador, PDF, mapa, regras
3. **Distâncias**: Adicionar distâncias com preços
4. **Kits**: Adicionar kits com imagens e itens
5. **Publicar**: Configurações finais e publicação

**Uso:**
```tsx
import EventForm from './components/EventForm';

<EventForm
  race={editingRace}
  onSave={(data) => handleSave(data)}
  onClose={() => setShowForm(false)}
  organizerId={user.id}
  organizerName={user.name}
/>
```

---

## 🗄️ Estrutura de Dados Atualizada

### **RaceDistance** (Distância)
```typescript
interface RaceDistance {
  km: number;           // Distância em km
  price: number;        // Preço
  name?: string;        // Nome (ex: "Caminhada")
  description?: string; // Descrição do percurso
  kitId?: string;       // ID do kit vinculado (opcional)
}
```

### **RaceKit** (Kit)
```typescript
interface RaceKit {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  includes: string[];
  distance?: number;      // Distância vinculada (opcional)
  distanceIds?: string[]; // IDs de distâncias vinculadas (opcional)
}
```

### **Race** (Evento)
```typescript
interface Race {
  // ... campos existentes
  regulationPdf?: string; // URL do PDF com regulamento
  routeMap?: string;      // URL da imagem do mapa
  distances: RaceDistance[];
  kits?: RaceKit[];
  shirtSizes?: string[];
}
```

### **Registration** (Inscrição)
```typescript
interface Registration {
  // ... campos existentes
  distanceId?: string; // ID da distância selecionada
  kitId?: string;      // ID do kit selecionado
  kitName?: string;    // Nome do kit selecionado
}
```

---

## 🗃️ SQL para Novas Colunas

Execute no **Supabase SQL Editor**:

```sql
-- Adicionar colunas para PDFs e mapas
ALTER TABLE races 
ADD COLUMN IF NOT EXISTS regulation_pdf TEXT,
ADD COLUMN IF NOT EXISTS route_map TEXT;

-- Adicionar coluna para distance_id
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS distance_id TEXT;

-- Verificar se foi criado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'races' 
AND column_name IN ('regulation_pdf', 'route_map');
```

---

## 📦 Criar Bucket para PDFs no Supabase

1. Acesse o Dashboard do Supabase
2. Vá em **Storage**
3. Clique em **"New bucket"**
4. Configure:
   - **Name:** `event-documents`
   - **Public bucket:** ✅ Marcado
5. Clique em **"Create bucket"**

---

## 🎯 Fluxo de Criação de Evento

### **Passo 1: Informações Básicas**
- Nome do evento
- Data e horário
- Local (endereço completo)
- Cidade e estado
- **Upload da imagem principal** (1200x630px)

### **Passo 2: Detalhes**
- Descrição completa
- Categoria e organizador
- Vagas máximas
- **Upload do PDF** (regulamento)
- **Upload do mapa** (se houver)
- O que está incluso
- Regras do evento

### **Passo 3: Distâncias**
- Adicionar distâncias (5km, 10km, 21km, etc.)
- Definir preço para cada distância
- Adicionar nome e descrição
- Reordenar com drag & drop

### **Passo 4: Kits**
- Adicionar kits (Básico, Premium, etc.)
- **Upload da imagem de cada kit** (400x300px)
- Definir preço e itens inclusos
- Vincular a distâncias (opcional)
- Reordenar com drag & drop
- Definir tamanhos de camisa

### **Passo 5: Publicação**
- Status de publicação (Rascunho/Publicado)
- Status de inscrições (Abertas/Encerradas/Finalizado)
- Destacar na página inicial
- Desconto (%)
- Tags para busca
- **Preview do evento**
- Salvar/Atualizar

---

## 🎨 Dimensões Recomendadas para Imagens

| Tipo | Dimensão | Aspect Ratio | Uso |
|------|----------|--------------|-----|
| **Imagem Principal** | 1200x630px | 16:9 | Banner do evento |
| **Imagem de Kit** | 400x300px | 4:3 | Thumbnail do kit |
| **Mapa do Percurso** | 800x600px | 4:3 | Visualização da rota |

---

## 🔄 Modos de Operação

### **Modo 1: Distâncias Independentes**
- Participante escolhe distância
- Depois escolhe kit (qualquer kit serve para qualquer distância)
- Ideal para eventos com múltiplas opções

### **Modo 2: Distâncias Vinculadas a Kits**
- Cada kit tem uma distância específica
- Ao escolher o kit, a distância é automaticamente selecionada
- Ideal para eventos com pacotes fechados

### **Modo 3: Misto**
- Algumas distâncias são independentes
- Outras estão vinculadas a kits específicos
- Máxima flexibilidade

---

## 📋 Checklist de Implementação

### **No Supabase:**
- [ ] Executar SQL `ADD_PDF_AND_MAPS.sql`
- [ ] Criar bucket `event-documents`
- [ ] Verificar se colunas foram criadas

### **No Código:**
- [x] Componente `ImageUpload` criado
- [x] Componente `PdfUpload` criado
- [x] Componente `EventPreview` criado
- [x] Componente `DragDropList` criado
- [x] Componente `EventForm` criado
- [x] Tipos atualizados (`RaceDistance`, `RaceKit`, `Registration`)
- [ ] Integrar `EventForm` no `AdminDashboard`
- [ ] Atualizar `RaceDetailsPage` para mostrar PDFs e mapas
- [ ] Atualizar `RegistrationPage` para suportar distâncias vinculadas
- [ ] Testar fluxo completo de criação

### **Testes:**
- [ ] Criar evento com upload de imagens
- [ ] Adicionar kits com imagens
- [ ] Fazer upload de PDF
- [ ] Ver preview em tempo real
- [ ] Publicar evento
- [ ] Testar inscrição com seleção de kit e distância
- [ ] Verificar se PDF aparece na página de detalhes

---

## 🚀 Próximos Passos

### **1. Integrar EventForm no AdminDashboard**
Substituir o `RaceFormModal` pelo novo `EventForm`:

```tsx
// No AdminDashboard.tsx
import EventForm from '../components/EventForm';

// Substituir:
{showForm && user && (
  <RaceFormModal ... />
)}

// Por:
{showForm && user && (
  <EventForm
    race={editingRace}
    onSave={async (data) => {
      if (editingRace) await updateRace(editingRace.id, data);
      else await addRace(data);
      setShowForm(false);
      setEditingRace(null);
    }}
    onClose={() => { setShowForm(false); setEditingRace(null); }}
    organizerId={user.id}
    organizerName={user.name}
  />
)}
```

### **2. Atualizar RaceDetailsPage**
Adicionar seções para PDF e mapa:

```tsx
{/* Regulamento */}
{race.regulationPdf && (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
    <h2 className="text-2xl font-bold mb-4 text-slate-900">Regulamento</h2>
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
      <FileText className="w-8 h-8 text-emerald-600" />
      <div className="flex-1">
        <p className="font-medium text-slate-900">Regulamento do Evento</p>
        <p className="text-sm text-slate-500">Clique para visualizar ou baixar</p>
      </div>
      <a
        href={race.regulationPdf}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
      >
        Visualizar PDF
      </a>
    </div>
  </div>
)}

{/* Mapa do Percurso */}
{race.routeMap && (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
    <h2 className="text-2xl font-bold mb-4 text-slate-900">Mapa do Percurso</h2>
    <img
      src={race.routeMap}
      alt="Mapa do percurso"
      className="w-full rounded-lg border border-slate-200"
    />
  </div>
)}
```

### **3. Atualizar RegistrationPage**
Adicionar suporte a distâncias vinculadas:

```tsx
// Ao selecionar um kit, verificar se tem distância vinculada
const handleSelectKit = (kitId: string) => {
  const kit = race.kits?.find(k => k.id === kitId);
  if (kit?.distance) {
    // Auto-selecionar a distância vinculada
    setSelectedDistance(kit.distance);
  }
  setSelectedKit(kitId);
};
```

---

## 📊 Benefícios das Melhorias

### **Para o Admin:**
- ✅ Criação de eventos mais intuitiva
- ✅ Preview em tempo real
- ✅ Upload de imagens com validação
- ✅ Organização visual com drag & drop
- ✅ Flexibilidade para diferentes tipos de eventos

### **Para o Participante:**
- ✅ Visualização clara dos kits com imagens
- ✅ Acesso a regulamentos e mapas
- ✅ Escolha flexível de distâncias e kits
- ✅ Experiência mais profissional

### **Para a Plataforma:**
- ✅ Dados estruturados e flexíveis
- ✅ Suporte a eventos complexos
- ✅ Escalabilidade para diferentes modalidades
- ✅ Design profissional e consistente

---

## 🎯 Resultado Final

Após implementar todas as melhorias:

✅ **Admin**: Cria eventos de forma intuitiva e visual
✅ **Participante**: Vê informações claras e completas
✅ **Sistema**: Dados estruturados e flexíveis
✅ **UX**: Fluxo otimizado e sem atritos
✅ **UI**: Design profissional e consistente

**A plataforma estará pronta para eventos de qualquer complexidade!** 🚀
