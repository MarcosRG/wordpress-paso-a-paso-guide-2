# Configuração de Variáveis de Ambiente - Netlify

## Problema Identificado

O sistema está falhando ao carregar dados do Neon Database porque as variáveis de ambiente necessárias não estão configuradas no Netlify, forçando o fallback lento para WooCommerce API.

## Variáveis de Ambiente Obrigatórias

Configure estas variáveis no **Netlify Dashboard > Site Settings > Environment Variables**:

### Database (Neon)
```
DATABASE_URL=postgresql://[usuario]:[senha]@[endpoint]/[database]?sslmode=require
NEON_PROJECT_ID=your-neon-project-id
NEON_CONNECTION_STRING=postgresql://[usuario]:[senha]@[endpoint]/[database]?sslmode=require
```

### WooCommerce API
```
WOOCOMMERCE_API_BASE=https://bikesultoursgest.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxx
```

### CRM (Optional)
```
CRM_API_USERNAME=your-crm-username
CRM_API_PASSWORD=your-crm-password
```

## Como Configurar no Netlify

1. Acesse o [Netlify Dashboard](https://app.netlify.com)
2. Selecione seu site/projeto
3. Vá em **Site Settings** > **Environment Variables**
4. Clique em **Add a variable**
5. Adicione cada variável com seu valor correspondente
6. Faça um novo deploy ou trigger rebuild

## Verificação

Após configurar as variáveis:

1. Acesse a consola do navegador na aplicação
2. Execute: `quickDiagnostic()` 
3. Verifique se o Neon Database aparece como conectado
4. Os produtos devem carregar mais rapidamente do Neon em vez do WooCommerce

## Melhorias de Performance Implementadas

✅ **Timeout de 5 segundos** - Fallback mais rápido se Neon não responder  
✅ **Melhor tratamento de erros** - Mensagens mais claras sobre problemas de configuração  
✅ **Detecção automática** - Sistema detecta automaticamente se deve usar Neon ou WooCommerce  
✅ **Logs melhorados** - Melhor visibilidade sobre qual fonte de dados está sendo usada  

## Status Atual

- ❌ Neon Database: Não configurado (variáveis de ambiente em falta)
- ✅ WooCommerce Fallback: Funcionando (mas lento)
- ✅ Error Handling: Melhorado
- ✅ Timeout: Configurado (5s)

## Próximos Passos

1. Configure as variáveis de ambiente no Netlify
2. Faça um novo deploy
3. Teste a velocidade de carregamento
4. Considere configurar sincronização automática
