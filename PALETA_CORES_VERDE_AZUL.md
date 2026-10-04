# Nova Paleta de Cores - Verde e Azul

## Conceito
A nova paleta foi desenvolvida para transmitir **saúde, bem-estar, vitalidade e paz**, alinhada com o propósito de uma plataforma de eventos esportivos.

## Cores Primárias

### Verde Esmeralda (Emerald)
- **emerald-50**: `#ecfdf5` - Fundos sutis, estados hover
- **emerald-100**: `#d1fae5` - Cards destacados
- **emerald-500**: `#10b981` - Ícones, badges de sucesso
- **emerald-600**: `#059669` - **COR PRIMÁRIA** - Botões principais, links, destaques
- **emerald-700**: `#047857` - Hover states, elementos ativos

**Significado**: Saúde, vitalidade, natureza, crescimento, energia positiva

### Azul Sky (Sky)
- **sky-50**: `#f0f9ff` - Fundos sutis
- **sky-100**: `#e0f2fe` - Cards informativos
- **sky-500**: `#0ea5e9` - Ícones, elementos de informação
- **sky-600**: `#0284c7` - **COR SECUNDÁRIA** - Botões secundários, links informativos
- **sky-700**: `#0369a1` - Hover states

**Significado**: Paz, confiança, serenidade, profissionalismo, tranquilidade

## Cores de Suporte

### Slate (Neutros)
- **slate-50**: `#f8fafc` - Backgrounds
- **slate-100**: `#f1f5f9` - Cards, seções
- **slate-200**: `#e2e8f0` - Borders
- **slate-300**: `#cbd5e1` - Inputs, divisores
- **slate-400**: `#94a3b8` - Textos secundários
- **slate-500**: `#64748b` - Textos terciários
- **slate-600**: `#475569` - Textos principais
- **slate-700**: `#334155` - Títulos
- **slate-800**: `#1e293b` - Títulos importantes
- **slate-900**: `#0f172a` - Títulos principais, logo

### Cores de Status
- **Sucesso**: `emerald-500` / `emerald-600`
- **Alerta**: `amber-400` / `amber-500`
- **Erro**: `rose-500` / `rose-600`
- **Informação**: `sky-500` / `sky-600`

## Aplicação por Componente

### Header
- Logo: `bg-emerald-600`
- Botão Admin: `bg-emerald-50` / `text-emerald-700`
- Avatar: `bg-emerald-600`
- Hover: `hover:border-emerald-400`

### Hero Section
- Background: `bg-gradient-to-br from-emerald-700 via-emerald-600 to-sky-600`
- Botão buscar: `bg-emerald-600` / `hover:bg-emerald-700`
- Badge: `bg-white/10` / `border-white/20`

### Filtros
- Categoria ativa: `bg-emerald-600` / `text-white`
- Categoria inativa: `hover:bg-emerald-50` / `hover:border-emerald-300`
- Data ativa: `bg-sky-600` / `text-white`
- Data inativa: `hover:bg-sky-50` / `hover:border-sky-300`

### Cards de Eventos
- Hover border: `hover:border-emerald-300`
- Título hover: `group-hover:text-emerald-600`
- Ícone data: `text-emerald-500`
- Ícone local: `text-sky-500`
- Tags distância: `bg-emerald-50` / `text-emerald-700`

### Página de Detalhes
- Ícones info cards: `bg-emerald-50` / `text-emerald-600` e `bg-sky-50` / `text-sky-600`
- Tags: `bg-emerald-50` / `text-emerald-700`
- Seleção distância ativa: `border-emerald-600` / `bg-emerald-50`
- Círculo distância ativa: `bg-emerald-600`
- Preço: `text-emerald-600`
- Botão inscrição: `bg-emerald-600` / `hover:bg-emerald-700`
- Card seleção: `bg-emerald-50` / `border-emerald-200`

### Formulários
- Focus ring: `focus:ring-emerald-500` / `focus:border-emerald-500`
- Botão submit: `bg-gradient-to-r from-emerald-600 to-sky-600`

### Pagamento
- Botão PIX: `bg-gradient-to-r from-emerald-600 to-sky-600`
- Botão cartão: `bg-gradient-to-r from-emerald-600 to-sky-600`
- Ícone QR: `text-emerald-600`
- Link copiar: `text-emerald-600`

### Comprovante
- Header gradiente: `bg-gradient-to-r from-emerald-600 to-sky-600`
- Ícone evento: `text-emerald-600`
- Ícone participante: `text-sky-600`
- Ícone pagamento: `text-emerald-600`
- Total: `text-emerald-600`
- Botão download: `bg-gradient-to-r from-emerald-600 to-sky-600`

### Footer
- Logo: `bg-emerald-600`
- Links hover: `hover:text-emerald-400`
- Ícones sociais hover: `hover:bg-emerald-600`

### Seção de Estatísticas
- Background: `bg-gradient-to-br from-emerald-700 via-emerald-600 to-sky-600`
- Labels: `text-emerald-100`

## Gradientes Principais

### Gradiente Hero/Stats
```css
bg-gradient-to-br from-emerald-700 via-emerald-600 to-sky-600
```
Transição suave de verde para azul, transmitindo energia e tranquilidade.

### Gradiente Botões Principais
```css
bg-gradient-to-r from-emerald-600 to-sky-600
```
Usado em CTAs principais, combinando ação (verde) com confiança (azul).

### Gradiente Hover
```css
hover:from-emerald-700 hover:to-sky-700
```
Versão mais escura para estados hover.

## Psicologia das Cores

### Verde (Emerald)
- **Saúde e Bem-estar**: Associado à natureza, vitalidade e renovação
- **Crescimento**: Transmite progresso e desenvolvimento pessoal
- **Equilíbrio**: Cor balanceada que não é agressiva
- **Positividade**: Gera sentimentos de otimismo e energia

### Azul (Sky)
- **Confiança**: Cor mais confiável segundo pesquisas
- **Paz e Serenidade**: Transmite calma e tranquilidade
- **Profissionalismo**: Amplamente usado em contextos corporativos
- **Estabilidade**: Sensação de segurança e consistência

### Combinação Verde + Azul
- **Harmonia**: Cores análogas que funcionam bem juntas
- **Equilíbrio**: Verde (ação) + Azul (confiança) = Decisão equilibrada
- **Natureza**: Remete ao céu e à terra, ambiente esportivo ao ar livre
- **Frescor**: Combinação vibrante mas não agressiva

## Acessibilidade

### Contraste
- Todos os textos em `emerald-600` sobre fundo branco passam WCAG AA
- Botões com fundo `emerald-600` e texto branco têm contraste adequado
- Ícones em `emerald-500` sobre `emerald-50` mantêm legibilidade

### Daltonismo
- Verde e azul são distinguíveis para a maioria dos tipos de daltonismo
- Não dependemos apenas de cor para transmitir informação (usamos ícones e texto)
- Status críticos usam também texto explicativo

## Benefícios para a Marca

1. **Diferenciação**: Sai do padrão laranja/vermelho comum em apps de eventos
2. **Profissionalismo**: Transmite seriedade e confiança
3. **Bem-estar**: Alinha com o propósito de promover saúde através do esporte
4. **Memorabilidade**: Combinação única e agradável visualmente
5. **Versatilidade**: Funciona bem em diferentes contextos e dispositivos

## Próximos Passos

```bash
git add .
git commit -m "Implementar nova paleta de cores verde/azul transmitindo saúde e bem-estar"
git push origin main
```

A nova paleta está aplicada em toda a plataforma, transmitindo os valores de saúde, bem-estar e paz que desejamos comunicar aos nossos usuários.
