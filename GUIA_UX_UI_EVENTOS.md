# 🎨 Guia de UX/UI para Criação de Eventos

## Melhorias Implementadas

### 1. 📸 Upload de Imagens com Preview

#### Componente `ImageUpload`
- **Upload drag & drop** ou clique para selecionar
- **Preview da imagem** antes de salvar
- **Indicação de dimensões ideais** para cada tipo de imagem
- **Validação automática** de tipo e tamanho
- **Feedback visual** durante o upload

#### Dimensões Recomendadas:

| Tipo de Imagem | Dimensão Ideal | Aspect Ratio | Uso |
|----------------|----------------|--------------|-----|
| **Imagem Principal** | 1200x630px | 16:9 | Banner do evento |
| **Imagem de Kit** | 400x300px | 4:3 | Thumbnail do kit |
| **Mapa do Percurso** | 800x600px | 4:3 | Visualização da rota |

#### Exemplo de Uso:
```tsx
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

### 2. 📏 Sistema de Distâncias Flexível

#### Nova Estrutura de Distâncias:
```typescript
interface RaceDistance {
  km: number;
  price: number;
  name?: string;        // Ex: "Corrida", "Caminhada"
  description?: string; // Detalhes do percurso
  kitId?: string;       // Vincular a um kit específico (opcional)
}
```

#### Modos de Operação:

**Modo 1: Distâncias Independentes**
- Participante escolhe distância
- Depois escolhe kit (qualquer kit serve para qualquer distância)

**Modo 2: Distâncias Vinculadas a Kits**
- Cada kit tem uma distância específica
- Ao escolher o kit, a distância é automaticamente selecionada

**Modo 3: Misto**
- Algumas distâncias são independentes
- Outras estão vinculadas a kits específicos

#### Exemplo de Configuração:

```json
{
  "distances": [
    {
      "km": 5,
      "price": 70.00,
      "name": "Caminhada",
      "description": "Percurso plano e acessível para todas as idades"
    },
    {
      "km": 10,
      "price": 100.00,
      "name": "Corrida",
      "description": "Percurso desafiador com subidas moderadas",
      "kitId": "kit-premium"
    }
  ]
}
```

---

### 3. 📄 Upload de PDFs (Regulamento/Detalhes)

#### Componente `PdfUpload`
- **Upload de PDFs** até 10MB
- **Preview com links** para visualizar e baixar
- **Botões de ação** (Visualizar, Baixar, Remover)
- **Feedback visual** durante o upload

#### Casos de Uso:
- Regulamento completo do evento
- Mapa detalhado do percurso
- Termo de responsabilidade
- Guia do participante
- Informações sobre retirada de kit

#### Exemplo de Uso:
```tsx
<PdfUpload
  value={formData.regulationPdf}
  onChange={(url) => setFormData({...formData, regulationPdf: url})}
  label="Regulamento do Evento (PDF)"
/>
```

---

### 4. 👁️ Preview em Tempo Real

#### Componente `EventPreview`
- **Visualização instantânea** de como o evento aparecerá
- **Atualização automática** conforme o admin preenche os dados
- **Layout responsivo** similar à página pública
- **Destaque de elementos** importantes (kits, distâncias, preços)

#### Benefícios:
- ✅ Admin vê exatamente como o participante verá
- ✅ Identifica erros de formatação antes de publicar
- ✅ Testa diferentes configurações visualmente
- ✅ Garante consistência visual

---

## 🎯 Fluxo Otimizado de Criação de Evento

### Passo 1: Informações Básicas
- Nome do evento
- Data e horário
- Local (endereço completo)
- Cidade e estado
- **Upload da imagem principal** (1200x630px)

### Passo 2: Descrição e Detalhes
- Descrição completa
- Organizador
- Categoria e modalidade
- **Upload do PDF** (regulamento)
- **Upload do mapa** (se houver)

### Passo 3: Distâncias e Preços
- Adicionar distâncias (5km, 10km, 21km, etc.)
- Definir preço para cada distância
- Adicionar nome e descrição (opcional)
- Vincular a kits específicos (opcional)

### Passo 4: Kits de Inscrição
- Adicionar kits (Básico, Premium, etc.)
- **Upload da imagem de cada kit** (400x300px)
- Definir preço e itens inclusos
- Vincular a distâncias (opcional)

### Passo 5: Tamanhos e Configurações
- Definir tamanhos de camisa disponíveis
- Configurar vagas máximas
- Definir regras do evento
- Adicionar tags para busca

### Passo 6: Publicação
- **Preview do evento** (ver como ficará)
- Escolher status (Rascunho/Publicado)
- Definir status de inscrições
- Publicar evento

---

## 📊 Estrutura de Dados Atualizada

### Tabela `races`:
```sql
CREATE TABLE races (
  -- Campos existentes...
  
  -- Novos campos
  regulation_pdf TEXT,        -- URL do PDF com regulamento
  route_map TEXT,             -- URL da imagem do mapa
  
  -- Campos JSONB existentes (estrutura atualizada)
  distances JSONB DEFAULT '[]'::jsonb,
  -- Estrutura: [{"km": 5, "price": 100, "name": "Caminhada", "description": "...", "kitId": "kit-1"}]
  
  kits JSONB DEFAULT '[]'::jsonb,
  -- Estrutura: [{"id": "kit-1", "name": "Básico", "price": 100, "image": "...", "includes": [...], "distanceIds": ["dist-1"]}]
  
  shirt_sizes JSONB DEFAULT '["PP", "P", "M", "G", "GG", "XGG"]'::jsonb
);
```

### Tabela `registrations`:
```sql
CREATE TABLE registrations (
  -- Campos existentes...
  
  -- Novos campos
  distance_id TEXT,  -- ID da distância selecionada
  kit_id TEXT,       -- ID do kit selecionado
  kit_name TEXT      -- Nome do kit selecionado
);
```

---

## 🎨 Melhores Práticas de UX

### 1. Feedback Imediato
- ✅ Mostrar preview enquanto preenche
- ✅ Validar campos em tempo real
- ✅ Indicadores de progresso (ex: "Passo 3 de 6")
- ✅ Mensagens de erro claras e específicas

### 2. Hierarquia Visual
- ✅ Agrupar campos relacionados
- ✅ Usar cores para destacar ações importantes
- ✅ Ícones para facilitar identificação
- ✅ Espaçamento adequado entre seções

### 3. Prevenção de Erros
- ✅ Confirmação antes de ações destrutivas
- ✅ Validação de formatos (email, telefone, etc.)
- ✅ Limites claros (tamanho de arquivo, caracteres)
- ✅ Auto-save de rascunhos

### 4. Acessibilidade
- ✅ Labels claros para todos os campos
- ✅ Contraste adequado de cores
- ✅ Navegação por teclado
- ✅ Mensagens de erro descritivas

---

## 🚀 Próximas Melhorias Sugeridas

### 1. Templates de Eventos
- Salvar configurações como template
- Reutilizar em eventos futuros
- Compartilhar templates entre organizadores

### 2. Importação em Massa
- Importar distâncias de planilha CSV
- Importar kits de eventos anteriores
- Duplicar eventos existentes

### 3. Colaboração
- Múltiplos admins por evento
- Sistema de comentários/aprovação
- Histórico de alterações

### 4. Analytics
- Visualizar métricas em tempo real
- Gráficos de inscrições por distância/kit
- Previsão de arrecadação

### 5. Automação
- Emails automáticos para participantes
- Lembretes de evento
- Geração automática de certificados

---

## 📝 Checklist de Implementação

- [x] Componente `ImageUpload` criado
- [x] Componente `PdfUpload` criado
- [x] Componente `EventPreview` criado
- [x] Tipos atualizados (`RaceDistance`, `RaceKit`, `Registration`)
- [x] SQL para novas colunas criado
- [x] Documentação de UX/UI criada
- [ ] Integrar componentes no `RaceFormModal`
- [ ] Atualizar `RaceDetailsPage` para mostrar PDFs
- [ ] Atualizar `RegistrationPage` para suportar distâncias vinculadas
- [ ] Testar fluxo completo de criação
- [ ] Deploy para produção

---

## 🎯 Resultado Esperado

Após implementar todas as melhorias:

✅ **Admin**: Cria eventos de forma intuitiva e visual
✅ **Participante**: Vê informações claras e completas
✅ **Sistema**: Dados estruturados e flexíveis
✅ **UX**: Fluxo otimizado e sem atritos
✅ **UI**: Design profissional e consistente

**A plataforma estará pronta para eventos de qualquer complexidade!** 🚀
