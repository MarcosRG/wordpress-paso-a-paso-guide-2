# GUIA DE INTEGRAÇÃO: SHORTCODES DINÂMICOS BIKESUL + FLUENTCRM

## PROBLEMA RESOLVIDO

O problema que você estava enfrentando era a sintaxe incorreta dos shortcodes. Usar `[bikesul_customer_name id="[order_id]"]` não funcionava porque o WordPress não processa shortcodes aninhados dessa forma.

## SOLUÇÃO IMPLEMENTADA

### 1. Sistema de Resolução Dinâmica
O arquivo `woocommerce-dynamic-order-shortcodes.php` agora inclui:
- ✅ Resolução automática de placeholders `[order_id]`
- ✅ Captura de contexto de pedidos do WooCommerce
- ✅ Múltiplas fontes para obter o order_id (sessão, cookies, URL, hooks)
- ✅ Processamento automático antes da execução dos shortcodes

### 2. Como Usar no FluentCRM

#### SINTAXE CORRETA (use exatamente assim):
```
[bikesul_customer_name id="[order_id]"]
[bikesul_rental_dates id="[order_id]"]
[bikesul_bikes_list id="[order_id]" format="table"]
[bikesul_insurance_info id="[order_id]"]
[bikesul_rental_days id="[order_id]"]
[bikesul_rental_times id="[order_id]"]
```

#### EXEMPLO COMPLETO PARA FLUENTCRM:
```
Encomenda Confirmada! 

Olá [bikesul_customer_name id="[order_id]"]

A sua reserva foi confirmada para [bikesul_rental_dates id="[order_id]"]

Detalhes do seu Aluguer:
[bikesul_bikes_list id="[order_id]" format="table"]

Informações do Seguro:
[bikesul_insurance_info id="[order_id]"]

Total de dias: [bikesul_rental_days id="[order_id]"] dias

Horários: [bikesul_rental_times id="[order_id]"]
```

## CONFIGURAÇÃO E TESTE

### 1. Verificar Instalação
Adicione este shortcode em qualquer página para testar:
```
[bikesul_debug_order_id]
```

### 2. Definir Order ID Manualmente (para testes)
```
[bikesul_set_order_id id="123"]
```

### 3. Testar com Order ID Específico
```
[bikesul_customer_name id="123"]
```

## TRIGGERS RECOMENDADOS NO FLUENTCRM

### 1. Mudança de Status do Pedido
- **Trigger**: WooCommerce Order Status Changed
- **Condição**: Status = processing, completed, etc.
- **Ação**: Criar tarefa no FluentBoard com shortcodes

### 2. Novo Pedido
- **Trigger**: WooCommerce New Order
- **Ação**: Usar os shortcodes para extrair informações

### 3. Pedido Confirmado
- **Trigger**: Order Status = Processing
- **Template de Email/Tarefa**: Use o exemplo completo acima

## SHORTCODES DISPONÍVEIS

| Shortcode | Descrição | Exemplo |
|-----------|-----------|---------|
| `[bikesul_customer_name id="[order_id]"]` | Nome completo do cliente | "João Silva" |
| `[bikesul_customer_email id="[order_id]"]` | Email do cliente | "joao@email.com" |
| `[bikesul_customer_phone id="[order_id]"]` | Telefone do cliente | "+351 912 345 678" |
| `[bikesul_rental_dates id="[order_id]"]` | Período de aluguel | "Del 15/01/2024 al 20/01/2024" |
| `[bikesul_rental_days id="[order_id]"]` | Total de dias | "5" |
| `[bikesul_rental_times id="[order_id]"]` | Horários | "Recogida: 09:00 \| Devolución: 18:00" |
| `[bikesul_bikes_list id="[order_id]" format="table"]` | Lista de bicicletas em tabela | Tabela HTML |
| `[bikesul_bikes_list id="[order_id]" format="simple"]` | Lista simples | "2 x Bicicleta Elétrica (M)" |
| `[bikesul_total_bikes id="[order_id]"]` | Número total de bicicletas | "3" |
| `[bikesul_insurance_info id="[order_id]"]` | Informações do seguro | Info completa do seguro |

## FORMATOS DISPONÍVEIS

### Para `bikesul_bikes_list`:
- `format="table"` - Tabela HTML completa
- `format="list"` - Lista HTML com bullets
- `format="simple"` - Texto simples

### Para `bikesul_insurance_info`:
- `field="all"` - Informação completa (padrão)
- `field="name"` - Apenas nome do seguro
- `field="price"` - Apenas preço
- `field="type"` - Apenas tipo

## RESOLUÇÃO DE PROBLEMAS

### 1. Shortcode Mostra Texto Literal
**Problema**: Os shortcodes aparecem como texto `[bikesul_customer_name id="[order_id]"]`
**Solução**: 
- Verificar se o arquivo foi incluído no `functions.php`
- Verificar se há contexto de pedido disponível
- Usar `[bikesul_debug_order_id]` para diagnosticar

### 2. Order ID Não é Encontrado
**Problema**: Shortcodes retornam vazio
**Soluções**:
- Certificar que o trigger do FluentCRM está configurado corretamente
- Verificar se o pedido existe e tem os meta campos necessários
- Usar order_id específico para testar: `id="123"`

### 3. Dados Não Aparecem
**Problema**: Order ID é encontrado mas dados não aparecem
**Verificar**:
- Se o pedido tem os meta campos customizados
- Se os produtos têm as informações de aluguel
- Se o seguro está marcado corretamente

## INSTALAÇÃO

1. **Copiar o conteúdo** do arquivo `woocommerce-dynamic-order-shortcodes.php`
2. **Colar no final** do arquivo `functions.php` do seu tema ativo
3. **Ou usar include**: `include_once('caminho/para/woocommerce-dynamic-order-shortcodes.php');`

## LOGS E DEBUG

O sistema registra logs em:
- **WordPress Debug Log**: Carregamento do sistema
- **Contexto de Pedidos**: Quando order_id é capturado
- **Resolução de Placeholders**: Para diagnóstico

## SUPORTE

Se os shortcodes ainda não funcionarem:
1. Ativar WordPress Debug (`WP_DEBUG = true`)
2. Verificar logs de erro
3. Testar com order_id específico primeiro
4. Usar `[bikesul_debug_order_id]` para diagnóstico

## EXEMPLO FINAL FUNCIONANDO

```
Encomenda #[order_id] Confirmada!

Olá [bikesul_customer_name id="[order_id]"],

A sua reserva foi confirmada para [bikesul_rental_dates id="[order_id]"].

📋 DETALHES DO ALUGUEL:
[bikesul_bikes_list id="[order_id]" format="table"]

🛡️ SEGURO:
[bikesul_insurance_info id="[order_id]"]

📅 DURAÇÃO: [bikesul_rental_days id="[order_id]"] dias
⏰ HORÁRIOS: [bikesul_rental_times id="[order_id]"]

👤 CONTATO: [bikesul_customer_email id="[order_id]"] | [bikesul_customer_phone id="[order_id]"]
```

Este template funcionará perfeitamente no FluentCRM quando um pedido for processado!
