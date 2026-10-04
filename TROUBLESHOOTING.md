# 🔧 SOLUÇÃO: Erro 404 na Vercel

## 🎯 Problema Identificado

O erro **404 NOT_FOUND** na Vercel geralmente acontece por:

1. ❌ Build falhou silenciosamente
2. ❌ Variáveis de ambiente não configuradas
3. ❌ Projeto precisa ser reconstruído
4. ❌ Cache da Vercel desatualizado

---

## ✅ Solução Passo a Passo

### **Passo 1: Verificar Build Localmente**

Antes de fazer push, teste o build localmente:

```bash
# Limpar cache
rm -rf node_modules dist package-lock.json

# Reinstalar dependências
npm install

# Tentar build
npm run build
```

Se o build funcionar localmente, o problema é na Vercel.

### **Passo 2: Verificar Variáveis de Ambiente na Vercel**

1. Acesse o dashboard da Vercel
2. Clique no seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione TODAS as variáveis:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE:** Apenas variáveis do frontend começam com `VITE_`. O Access Token do Mercado Pago NÃO vai na Vercel — configure-o nas Edge Functions: `supabase secrets set MERCADOPAGO_ACCESS_TOKEN=...`

### **Passo 3: Forçar Novo Deploy**

1. No dashboard da Vercel, vá em **Deployments**
2. Encontre o último deploy
3. Clique nos **três pontos** (⋮)
4. Clique em **"Redeploy"**
5. Marque **"Use existing Build Cache"** como **desmarcado**

### **Passo 4: Verificar Logs do Build**

1. No dashboard da Vercel, vá em **Deployments**
2. Clique no último deploy
3. Veja os **Build Logs**
4. Procure por erros vermelhos

---

## 🔍 Diagnóstico Rápido

### **Teste 1: Acesse a raiz do site**

```
https://seu-site.vercel.app/
```

Se funcionar aqui mas não em outras rotas, o problema é de configuração de rotas.

### **Teste 2: Acesse a página de diagnóstico**

```
https://seu-site.vercel.app/diagnostico
```

Esta página vai testar todas as integrações.

### **Teste 3: Verifique o console do navegador**

1. Abra o site
2. Pressione **F12**
3. Vá na aba **Console**
4. Procure por erros vermelhos

---

## 🛠️ Problemas Comuns e Soluções

### **Problema 1: "Module not found"**

**Causa:** Dependências não instaladas

**Solução:**
```bash
npm install
git add .
git commit -m "Fix dependencies"
git push
```

### **Problema 2: "Environment variables not found"**

**Causa:** Variáveis não configuradas na Vercel

**Solução:**
1. Vá em Settings → Environment Variables
2. Adicione todas as variáveis
3. Redeploy

### **Problema 3: Página em branco**

**Causa:** Erro JavaScript no runtime

**Solução:**
1. Abra o console (F12)
2. Veja o erro
3. Me envie o erro

### **Problema 4: 404 em todas as rotas**

**Causa:** vercel.json não configurado corretamente

**Solução:**
O arquivo `vercel.json` já está configurado corretamente. Se o problema persistir:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 🚀 Checklist Final

Antes de fazer push, verifique:

- [ ] Build funciona localmente (`npm run build`)
- [ ] Pasta `dist/` foi gerada
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Último deploy foi bem-sucedido (verde)
- [ ] Não há erros nos Build Logs

---

## 📞 Se o Problema Persistir

### **Opção 1: Me envie os logs**

1. Vercel → Deployments → Último deploy
2. Copie os **Build Logs**
3. Me envie

### **Opção 2: Me envie o console**

1. Acesse o site
2. F12 → Console
3. Copie os erros
4. Me envie

### **Opção 3: Reset completo**

```bash
# No seu computador
rm -rf node_modules dist .vercel
npm install
npm run build

# Commit e push
git add .
git commit -m "Reset and rebuild"
git push -f
```

---

## 💡 Dica Importante

O projeto está configurado para funcionar em **MODO DEMO** quando as variáveis de ambiente não estão configuradas. Isso significa que:

- ✅ O site deve funcionar mesmo sem Supabase
- ✅ Usa localStorage como fallback
- ✅ Todas as funcionalidades básicas funcionam

Se o site não está funcionando mesmo em modo demo, há um problema no build ou deploy.

---

## 🎯 Próximo Passo

**Tente acessar:** `https://seu-site.vercel.app/diagnostico`

Se esta página funcionar, me diga o resultado dos testes.

Se não funcionar, me envie:
1. Screenshot do erro
2. Build Logs da Vercel
3. Console do navegador (F12)

**Estou aqui para ajudar!** 🚀
