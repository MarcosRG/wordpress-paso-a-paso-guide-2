# CORREÇÃO: Erro set_price() em WC_Order_Item_Product

## Problema
O sistema estava apresentando um erro fatal durante o checkout:

```
PHP Fatal error: Uncaught Error: Call to undefined method WC_Order_Item_Product::set_price() in woocommerce-insurance-handler.php:277
```

## Causa
O método `set_price()` não existe na classe `WC_Order_Item_Product`. Este método existe apenas em objetos `WC_Product`, não em itens de pedido.

## Solução
Removido o uso incorreto de `$item->set_price($price_per_unit)` na linha 277 do arquivo `woocommerce-insurance-handler.php`.

### Antes:
```php
$item->set_quantity($insurance_quantity);
$item->set_price($price_per_unit);           // ❌ ERRO: método não existe
$item->set_total($total_insurance_price);
$item->set_subtotal($total_insurance_price);
```

### Depois:
```php
$item->set_quantity($insurance_quantity);
// Remover set_price() que não existe na classe WC_Order_Item_Product
// Apenas usar set_total() e set_subtotal() que são os métodos corretos
$item->set_total($total_insurance_price);
$item->set_subtotal($total_insurance_price);
```

## Métodos Corretos para WC_Order_Item_Product
- ✅ `set_total()` - define o total do item
- ✅ `set_subtotal()` - define o subtotal do item  
- ✅ `set_quantity()` - define a quantidade
- ✅ `add_meta_data()` - adiciona metadados
- ✅ `update_meta_data()` - atualiza metadados
- ❌ `set_price()` - NÃO EXISTE nesta classe

## Impacto
- O erro fatal durante o checkout foi eliminado
- O sistema de seguros continua funcionando normalmente
- Os cálculos de preço permanecem corretos usando `set_total()` e `set_subtotal()`

## Data da Correção
05 de Agosto de 2025
