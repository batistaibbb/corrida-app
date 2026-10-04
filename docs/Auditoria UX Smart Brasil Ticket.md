Auditoria de UX/UI · smartbrasilticket.vercel.app

# O que ajustar na plataforma para inscrever mais gente e administrar com menos esforço

Revisei o fluxo do participante (descoberta, inscrição, pagamento, comprovante, Minhas inscrições) e o painel do administrador. Os 39 achados abaixo estão ordenados por severidade, cada um com o arquivo e a linha onde aparece e a correção recomendada.

Base: leitura do código do repositório `corrida-app` (branch `main`) em 4 de outubro de 2026. Não testei a interface em um navegador nem com usuários reais; veja “Limites desta análise” no fim.

## Faça isto antes de qualquer outra coisa

Oito ajustes pequenos que removem risco ou frustração real. Cabem em um ou dois dias.

1. Esconder as **credenciais de teste** da tela de login em produção (P4).
2. Aplicar o **desconto** no valor cobrado, igual ao que a página do evento mostra (P5).
3. Impedir inscrição em evento cuja data já passou (P1).
4. Trocar o polling mudo por uma mensagem final com “Verificar agora” (G2).
5. Trocar o seletor PIX/Cartão por um único botão “Pagar no Mercado Pago” (G3).
6. Bloquear a exclusão de evento que já tem inscritos (A1).
7. Pedir confirmação com nome e valor antes de aprovar pagamento manualmente (A2).
8. Remover as rotas públicas `/diagnostico` e `/teste-supabase` (T4).

Já resolvido no PR #29: redirecionar ao comprovante quando a inscrição está confirmada e bloquear novo checkout de inscrição já paga.

Área

Severidade

Nenhum achado com esses filtros.

## Ordem sugerida de execução

Fase 0 · 1 a 2 dias

### Risco e confiança

- P4, P1, P5
- G2, G3
- A1, A2
- T4 e meta tags (T3)

Fase 1 · 1 a 2 semanas

### Conversão do participante

- Volta ao ponto certo após o login (P2)
- Validação e pré-preenchimento (P3, P8, P7)
- Pagamento pendente e status claros (G1, G5, G6)
- Comprovante útil no dia da prova (G7)
- Toasts no lugar de `alert()` (A5)

Fase 2 · 2 a 4 semanas

### Painel e base técnica

- Dashboard por evento (A3)
- Listas com paginação e ações em massa (A10)
- Papel de organizador (A12)
- Painel no celular (A13)
- Divisão de código e acessibilidade (T1, T2)

## O que já funciona bem

- Helpers que evitam tela branca com preço nulo (`toSafeNumber`, `formatBRL`, `getLowestPrice`).
- Cards de evento completos: selo de status, desconto, “a partir de”, data por extenso e distâncias.
- Resumo lateral da inscrição acompanha a escolha, e a etapa de camiseta só aparece quando o kit inclui camisa.
- Pagamento com três camadas de confirmação (webhook, confirmação direta, polling) e dados de cartão que nunca passam pelo site.
- Aba Inscrições do painel com busca multicampo, filtros por evento e status, e exportação que respeita o filtro.
- Formulário de evento em 5 passos com pré-visualização ao vivo, e uploads que validam tipo e tamanho.

## Limites desta análise

Tudo vem da leitura do código. Não abri o site em um navegador, não medi desempenho real e não vi telas em celulares de verdade.

Não tenho dados de uso. Antes de priorizar por conversão, registre eventos do funil: visita ao evento, início da inscrição, cada passo, ida ao Mercado Pago, pagamento confirmado.

Alguns achados dependem de regras de negócio que só você conhece, como a taxa de serviço, o cancelamento e a transferência de inscrição. Marquei como recomendação, não como erro.