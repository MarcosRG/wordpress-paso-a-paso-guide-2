# 🔧 Configuração de Variáveis de Ambiente - Netlify

## ❌ Problema Atual
A app está apresentando os seguintes erros:
- `Netlify Functions não configuradas. Verifique variáveis de ambiente no painel do Netlify.`
- `MySQL API Error 500`
- `MySQL configuration incomplete`

## ✅ Solução: Configurar Variáveis no Painel do Netlify

### 1. Aceder ao Painel do Netlify
1. Vá para [https://app.netlify.com](https://app.netlify.com)
2. Acesse o seu projeto **BikeRul Tours** 
3. Vá para **Site Settings** → **Environment Variables**

### 2. Variáveis Obrigatórias para Neon Database

```bash
# Neon Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@hostname/database
NEON_PROJECT_ID=your-neon-project-id
NEON_BRANCH_ID=main  # opcional, usa main por padrão
```

### 3. Variáveis Obrigatórias para MySQL

```bash
# MySQL Connection (WordPress Database)
MYSQL_HOST=your-mysql-host.com
MYSQL_DATABASE=your_database_name
MYSQL_USERNAME=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
MYSQL_PORT=3306
MYSQL_TABLE_PREFIX=wp_
```

### 4. Variáveis Obrigatórias para WooCommerce API

```bash
# WooCommerce API
WOOCOMMERCE_API_BASE=https://bikesultoursgest.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=cs_your_consumer_secret
```

### 5. Variáveis Opcionais para CRM

```bash
# FluentCRM API (opcional)
CRM_API_USERNAME=your_crm_username
CRM_API_PASSWORD=your_crm_password
CRM_API_BASE_URL=https://bikesultoursgest.com
```

### 6. Variáveis de Configuração

```bash
# Feature Flags
ENABLE_DEBUG=true
ENABLE_AUTO_SYNC=true
ENABLE_REAL_TIME_STOCK=true

# Performance
DB_TIMEOUT=30
SYNC_INTERVAL=600000
STOCK_UPDATE_INTERVAL=120000
MAX_RETRIES=3
```

## 🚀 Como Adicionar no Netlify

### Método 1: Via Interface Web
1. **Site Settings** → **Environment Variables**
2. Clique em **Add Variable**
3. Adicione **Key** e **Value**
4. Clique **Save**
5. Repita para todas as variáveis

### Método 2: Via Netlify CLI
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Configurar variáveis
netlify env:set DATABASE_URL "postgresql://username:password@hostname/database"
netlify env:set NEON_PROJECT_ID "your-project-id"
netlify env:set MYSQL_HOST "your-host.com"
# ... continuar para todas as variáveis
```

## 🔄 Após Configurar

1. **Trigger um novo deploy**:
   - No painel do Netlify: **Deploys** → **Trigger Deploy** → **Deploy Site**

2. **Verificar logs**:
   - **Functions** → Ver logs das funções
   - Procurar mensagens como `✅ Configuração Netlify validada corretamente`

3. **Testar endpoints**:
   ```bash
   # Testar Neon Products
   https://your-site.netlify.app/.netlify/functions/neon-products
   
   # Testar MySQL API
   https://your-site.netlify.app/.netlify/functions/mysql-bikes
   ```

## 🧪 Debug

### Verificar Configuração
Adicione estas variáveis temporariamente para debug:
```bash
ENABLE_DEBUG=true
LOG_LEVEL=debug
```

### Logs Esperados (Sucesso)
```
✅ Configuração Netlify validada corretamente
✅ MySQL Config: user@host/database  
✅ MySQL connection successful
✅ Neon DB: X produtos encontrados
```

### Logs de Erro (Configuração Incorreta)
```
❌ Variables de entorno faltantes: DATABASE_URL, MYSQL_HOST
❌ MySQL configuration incomplete: MYSQL_HOST, MYSQL_PASSWORD
❌ MySQL connection failed: Access denied for user
```

## 📞 Suporte

Se os erros persistirem após configurar todas as variáveis:

1. **Verifique credenciais**: Teste conexões MySQL/Neon fora do Netlify
2. **Permissões**: Verifique se o user MySQL tem permissões adequadas
3. **Network**: Verifique se o Netlify pode acessar seus databases
4. **Formato**: Verifique formato das connection strings

## 🎯 Resultado Esperado

Após configurar corretamente:
- ✅ Netlify Functions funcionando
- ✅ MySQL API retornando productos
- ✅ Neon Database sincronizando
- ✅ WooCommerce fallback funcionando
- ✅ App carregando productos corretamente
