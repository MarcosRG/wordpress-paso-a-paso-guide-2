# Guia Completo: Shortcodes Bikesul + Fluent Board

## 🚨 PROBLEMA IDENTIFICADO

Os shortcodes Bikesul não estavam sendo processados no Fluent Board porque:

1. **Fluent Board não processa shortcodes automaticamente** - ao contrário de páginas/posts WordPress
2. **Placeholders dinâmicos `[order_id]` não eram resolvidos** no contexto das automações
3. **Faltavam filtros específicos** para aplicar `do_shortcode()` no conteúdo do Fluent Board

## 🛠️ SOLUÇÃO IMPLEMENTADA

Criamos um patch específico que resolve todos esses problemas: `woocommerce-fluentboard-shortcodes-patch.php`

---

## 📋 INSTALAÇÃO PASO A PASO

### Passo 1: Verificar Arquivos Principais

Certifique-se de que estes arquivos estão ativos:

1. ✅ `woocommerce-dynamic-order-shortcodes.php` (sistema principal)
2. ✅ `woocommerce-fluentboard-shortcodes-patch.php` (patch para Fluent Board)

### Passo 2: Adicionar ao functions.php

Adicione no final do `functions.php` do seu tema ativo:

```php
// Shortcodes Bikesul - Sistema Principal
include_once(get_template_directory() . '/woocommerce-dynamic-order-shortcodes.php');

// Patch específico para Fluent Board
include_once(get_template_directory() . '/woocommerce-fluentboard-shortcodes-patch.php');
```

### Passo 3: Configurar FluentCRM (Trigger)

1. **Acesse**: FluentCRM → Automations → Create New
2. **Trigger**: "WooCommerce Order Status Changed"
3. **Condições**: 
   - New Status = "processing" OU "completed"
   - Order Total > 0

### Passo 4: Configurar Ação FluentBoard

1. **Ação**: "Create FluentBoard Task"
2. **Board**: Escolha o board desejado
3. **Template**: Use o template abaixo

---

## 📝 TEMPLATE RECOMENDADO PARA FLUENT BOARD

### Título da Tarefa:
```
Pedido #[order_id] - [bikesul_customer_name id="[order_id]"]
```

### Descrição da Tarefa:
```
🔥 NOVA RESERVA CONFIRMADA

👤 CLIENTE:
Nome: [bikesul_customer_name id="[order_id]"]
Email: [bikesul_customer_email id="[order_id]"]
Telefone: [bikesul_customer_phone id="[order_id]"]

📅 PERÍODO:
Datas: [bikesul_rental_dates id="[order_id]"]
Total de dias: [bikesul_rental_days id="[order_id]"] dias
Horários: [bikesul_rental_times id="[order_id]"]

🚴 BICICLETAS:
[bikesul_bikes_list id="[order_id]" format="simple"]

🛡️ SEGURO:
[bikesul_insurance_info id="[order_id]"]

💰 RESUMO:
Total de bicicletas: [bikesul_total_bikes id="[order_id]"]
```

---

## 🧪 TESTE E VERIFICAÇÃO

### Teste 1: Shortcode de Debug

Adicione este shortcode em uma tarefa para verificar se o sistema está funcionando:

```
[bikesul_debug_fluentboard]
```

**Resultado esperado**: Deve mostrar informações de debug incluindo o order_id atual.

### Teste 2: Definir Order ID Manualmente

Para testar com um pedido específico:

```
[bikesul_force_order_id id="123"]
[bikesul_customer_name id="[order_id]"]
```

Substitua `123` pelo ID de um pedido real.

### Teste 3: Criar Pedido de Teste

1. **Faça um pedido de teste** no WooCommerce
2. **Mude o status** para "Processing"
3. **Verifique** se a tarefa foi criada no FluentBoard
4. **Confirme** se os shortcodes foram processados corretamente

---

## 🔧 CONFIGURAÇÕES AVANÇADAS

### Customizar Filtros

O patch aplica filtros em:
- `fluent_board/task_content`
- `fluent_board/comment_content`
- `fluent_board/task_description`
- `fluentcrm/email_content`

### Personalizar Template

Você pode usar qualquer combinação destes shortcodes:

```
[bikesul_customer_name id="[order_id]"]
[bikesul_customer_email id="[order_id]"]
[bikesul_customer_phone id="[order_id]"]
[bikesul_rental_dates id="[order_id]"]
[bikesul_rental_times id="[order_id]"]
[bikesul_rental_days id="[order_id]"]
[bikesul_bikes_list id="[order_id]" format="table"]
[bikesul_bikes_list id="[order_id]" format="simple"]
[bikesul_total_bikes id="[order_id]"]
[bikesul_insurance_info id="[order_id]"]
[bikesul_insurance_info id="[order_id]" field="name"]
[bikesul_insurance_info id="[order_id]" field="price"]
```

---

## 🚨 RESOLUÇÃO DE PROBLEMAS

### Problema: Shortcodes aparecem como texto

**Solução**:
1. Verifique se o patch está instalado
2. Adicione `[bikesul_debug_fluentboard show_all="yes"]` para debug completo
3. Verifique logs de erro WordPress

### Problema: Order ID não é encontrado

**Solução**:
1. Certifique-se de que o trigger está configurado para mudança de status
2. Use `[bikesul_force_order_id id="123"]` para testes
3. Verifique se o pedido existe e tem status correto

### Problema: Dados aparecem vazios

**Solução**:
1. Confirme que o pedido tem os meta campos necessários
2. Verifique se o pedido tem produtos de bicicleta (não apenas seguro)
3. Use format="json" para ver todos os dados disponíveis

### Verificar Logs

Ative o debug do WordPress e verifique `/wp-content/debug.log` para mensagens como:

```
BIKESUL FluentBoard: Order ID 123 capturado para cliente@email.com
BIKESUL FluentBoard: Processando shortcode - Original: [bikesul_customer_name id="[order_id]"], Processado: [bikesul_customer_name id="123"]
```

---

## 📊 TEMPLATES ALTERNATIVOS

### Template Simples
```
Cliente: [bikesul_customer_name id="[order_id]"]
Período: [bikesul_rental_dates id="[order_id]"]
Bicis: [bikesul_total_bikes id="[order_id]"] unidades
```

### Template Completo com Tabela
```
RESERVA CONFIRMADA

Cliente: [bikesul_customer_name id="[order_id]"] ([bikesul_customer_email id="[order_id]"])
Período: [bikesul_rental_dates id="[order_id]"] ([bikesul_rental_days id="[order_id]"] dias)

BICICLETAS RESERVADAS:
[bikesul_bikes_list id="[order_id]" format="table"]

SEGURO CONTRATADO:
[bikesul_insurance_info id="[order_id]"]

HORÁRIOS:
[bikesul_rental_times id="[order_id]"]
```

### Template para Email/Notificação
```
Olá [bikesul_customer_name id="[order_id]"],

Sua reserva foi confirmada para [bikesul_rental_dates id="[order_id]"].

Detalhes: [bikesul_bikes_list id="[order_id]" format="simple"]
Seguro: [bikesul_insurance_info id="[order_id]" field="name"]
Total de dias: [bikesul_rental_days id="[order_id]"] dias

Horários: [bikesul_rental_times id="[order_id]"]
```

---

## 🎯 CASOS DE USO AVANÇADOS

### 1. Tarefas Automáticas por Status

**Processing**: Preparar bicicletas
```
🚴 PREPARAR BICICLETAS

Cliente: [bikesul_customer_name id="[order_id]"]
Retirada: [bikesul_rental_dates id="[order_id]"]

Lista para preparação:
[bikesul_bikes_list id="[order_id]" format="simple"]
```

**Completed**: Confirmar entrega
```
✅ PEDIDO ENTREGUE

Cliente: [bikesul_customer_name id="[order_id]"]
Contato: [bikesul_customer_phone id="[order_id]"]

Confirmar devolução em: [bikesul_rental_times id="[order_id]"]
```

### 2. Notificações Personalizadas

Para diferentes equipes:
- **Preparo**: Foco nas bicicletas e horários
- **Atendimento**: Foco no cliente e contato
- **Financeiro**: Foco nos valores e seguro

---

## ✅ CHECKLIST FINAL

- [ ] Arquivo principal de shortcodes está ativo
- [ ] Patch para FluentBoard está instalado
- [ ] Trigger no FluentCRM está configurado
- [ ] Template de tarefa está definido
- [ ] Teste foi realizado com pedido real
- [ ] Shortcodes são processados corretamente
- [ ] Dados aparecem nas tarefas do FluentBoard

## 🆘 SUPORTE

Se ainda houver problemas:

1. **Ative o debug** (`WP_DEBUG = true`)
2. **Verifique os logs** de erro
3. **Use os shortcodes de debug** fornecidos
4. **Teste com order_id específico** primeiro

O sistema agora deve funcionar perfeitamente com Fluent Board! 🎉
