# ✅ GUIA RÁPIDO DE VERIFICAÇÃO

Você disse que conseguiu fazer as integrações. Vamos verificar se tudo está funcionando!

## 🔍 Checklist Rápido

### 1. Variáveis de Ambiente
- [ ] Você criou o arquivo `.env.local`?
- [ ] Adicionou `VITE_SUPABASE_URL`?
- [ ] Adicionou `VITE_SUPABASE_ANON_KEY`?
- [ ] Adicionou `VITE_MERCADOPAGO_PUBLIC_KEY`?

### 2. Supabase
- [ ] Projeto criado em supabase.com?
- [ ] SQL executado (tabelas criadas)?
- [ ] Bucket `event-images` criado no Storage?
- [ ] Edge Functions deployadas?

### 3. Mercado Pago
- [ ] Aplicação criada em mercadopago.com.br/developers?
- [ ] Credenciais copiadas (Public Key + Access Token)?
- [ ] Webhook configurado apontando para sua Edge Function?

### 4. Vercel
- [ ] Repositório conectado?
- [ ] Variáveis de ambiente adicionadas?
- [ ] Deploy realizado com sucesso?

---

## 🧪 Como Testar

### Opção 1: Teste no Console do Navegador

1. Acesse seu site deployado
2. Abra o DevTools (F12)
3. Vá na aba **Console**
4. Digite: `testSupabase()`
5. Pressione Enter

Você verá algo como:
```
🔍 Testando conexão com Supabase...

1️⃣  Testando autenticação...
   ✅ Autenticação OK

2️⃣  Testando acesso às tabelas...
   ✅ Tabela races OK (3 registros)
   ✅ Tabela profiles OK

3️⃣  Testando storage...
   ✅ Bucket event-images encontrado

4️⃣  Testando Edge Functions...
   ✅ Edge Function mercadopago-webhook OK

✅ Teste concluído!
```

### Opção 2: Teste Manual

#### Testar Login
1. Acesse `/login`
2. Tente logar com `admin@runbrasil.com.br` / `admin123`
3. Se funcionar, você será redirecionado para `/admin`

#### Testar Criação de Evento
1. No painel admin, clique em "Novo Evento"
2. Preencha os dados
3. Salve
4. Verifique se o evento aparece na página inicial

#### Testar Inscrição
1. Faça logout
2. Crie uma conta de participante
3. Escolha um evento
4. Faça inscrição
5. Escolha PIX ou Cartão
6. Verifique se o pagamento é processado

---

## 🐛 Problemas Comuns

### "Missing Supabase environment variables"
**Solução:** Crie o arquivo `.env.local` com as variáveis corretas

### "relation does not exist"
**Solução:** Execute o SQL em `supabase/migrations/001_initial_schema.sql`

### "Bucket not found"
**Solução:** Crie o bucket `event-images` no Storage do Supabase

### "Edge Function not found"
**Solução:** Deploy as functions com `supabase functions deploy`

### Pagamento não funciona
**Solução:** Verifique se as credenciais do Mercado Pago estão corretas e se o webhook está configurado

---

## 📞 Precisa de Ajuda?

Se algo não estiver funcionando:

1. **Verifique os logs** no console do navegador (F12)
2. **Verifique os logs** no dashboard do Supabase
3. **Verifique os logs** no dashboard da Vercel
4. **Consulte** o `SETUP_GUIDE.md` para instruções detalhadas

---

## 🎯 Próximo Passo

Se tudo estiver funcionando, parabéns! 🎉

Se algo não estiver funcionando, me diga qual é o erro e eu te ajudo a resolver.

**Digite no console:** `testSupabase()` e me envie o resultado!
