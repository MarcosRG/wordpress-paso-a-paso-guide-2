# ⚠️ ERRO: Netlify Functions não disponíveis - Configuração de Variáveis de Ambiente

## Problema Identificado

O erro "**Resposta não é JSON válido - netlify function não disponível**" indica que as variáveis de ambiente não estão configuradas no painel do Netlify.

## Solução: Configurar Variáveis de Ambiente no Netlify

### 1. Acesse o Painel do Netlify

1. Vá para [https://app.netlify.com/](https://app.netlify.com/)
2. Encontre seu site `bikesultoursgest` ou similar
3. Clique no site para entrar nas configurações

### 2. Configure as Variáveis de Ambiente

1. No painel do site, clique em **"Site settings"**
2. No menu lateral, clique em **"Environment variables"**
3. Clique em **"Add variable"** para cada uma das seguintes:

#### Variáveis Obrigatórias para Neon Database:

```bash
# Para as Netlify Functions (servidor)
NEON_CONNECTION_STRING = postgresql://neondb_owner:npg_f5qU6FzxSZXJ@ep-silent-waterfall-aeyw6n39-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require

# Para o frontend
VITE_NEON_PROJECT_ID = noisy-mouse-34441036
VITE_NEON_CONNECTION_STRING = postgresql://neondb_owner:npg_f5qU6FzxSZXJ@ep-silent-waterfall-aeyw6n39-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
VITE_NEON_BRANCH_ID = br-hidden-rice-ae9w1ii3
```

#### Variáveis do WooCommerce (se necessário):

```bash
VITE_WOOCOMMERCE_API_BASE = https://bikesultoursgest.com/wp-json/wc/v3
VITE_WOOCOMMERCE_CONSUMER_KEY = [sua_consumer_key]
VITE_WOOCOMMERCE_CONSUMER_SECRET = [sua_consumer_secret]
```

### 3. Deploy Novamente

Após configurar as variáveis:

1. Clique em **"Save"** após adicionar cada variável
2. Vá para **"Deploys"** no menu lateral
3. Clique em **"Trigger deploy"** → **"Deploy site"**

### 4. Verificar se Funcionou

Após o deploy completar:

1. Vá para seu site: https://app.bikesultoursgest.com
2. Acesse o painel admin
3. Na seção "Neon Database Management" deve aparecer "**Conectado**"
4. Clique em "Sincronizar WooCommerce → Neon" para testar

## Verificação Adicional

Se ainda não funcionar, verifique:

### 1. Logs do Netlify Functions

No painel do Netlify:
1. Vá para **"Functions"** no menu lateral
2. Clique em cada função (`neon-products`, `neon-sync`)
3. Verifique os logs para ver se há erros

### 2. Teste Manual da Function

Teste a URL diretamente:
```
https://app.bikesultoursgest.com/.netlify/functions/neon-products
```

Deve retornar JSON, não código JavaScript.

## Status Esperado Após Correção

✅ **Neon Database Management: Conectado**
✅ **Erro de conexão:** Resolvido
✅ **Sincronização:** Funcionando

---

**Importante:** Todas as variáveis que começam com `VITE_` são expostas no frontend. As sem prefixo ficam apenas no servidor (Netlify Functions).
