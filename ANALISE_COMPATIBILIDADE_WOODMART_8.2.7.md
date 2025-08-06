# Análise de Compatibilidade: Arquivos PHP de Preços vs WoodMart 8.2.7

## Problemas Identificados e Soluções

### 1. **CRÍTICO: Conflito com "Improved quantity validation"**

**Problema**: WoodMart 8.2.7 introduziu validação melhorada de quantidade que pode interferir com o sistema de preços customizado.

**Arquivos Afetados**:
- `woocommerce-bikesul-pricing-v2-unified.php` (linhas 122-123)
- `woocommerce-bikesul-pricing.php` (linhas 127-128)
- `bikesul-pricing-emergency-fix.php` (linhas 189, 205)

**Código Problemático**:
```php
$cart_item['data']->set_price($total_price_per_unit);
```

**Solução Recomendada**:
```php
// Adicionar validação de quantidade antes de set_price
if ($total_price_per_unit > 0 && is_numeric($total_price_per_unit)) {
    // Verificar compatibilidade com WoodMart quantity validation
    if (function_exists('woodmart_validate_quantity')) {
        $validated_quantity = woodmart_validate_quantity($cart_item['quantity'], $cart_item['product_id']);
        if ($validated_quantity !== $cart_item['quantity']) {
            error_log("BIKESUL: Quantity validation conflict detected");
        }
    }
    $cart_item['data']->set_price($total_price_per_unit);
}
```

### 2. **ALTO: "Hide 'to' price option after WooCommerce 10.0 update"**

**Problema**: A mudança pode afetar como os preços de aluguel são exibidos, especialmente preços variáveis.

**Arquivos Afetados**:
- Todos os arquivos de pricing que usam `set_price()`

**Impacto**: Preços podem não ser exibidos corretamente se o tema estiver ocultando opções de preço "até".

**Solução Recomendada**:
```php
// Forçar exibição de preço único para produtos de aluguel
add_filter('woocommerce_get_price_html', 'bikesul_fix_price_display', 10, 2);
function bikesul_fix_price_display($price, $product) {
    if (is_rental_product($product)) {
        // Forçar exibição de preço único
        return wc_price($product->get_price());
    }
    return $price;
}
```

### 3. **MÉDIO: Hooks conflitantes com sistema unificado**

**Problema**: Múltiplos sistemas de pricing executando simultaneamente podem causar conflitos.

**Status Atual**: ✅ **RESOLVIDO** no `woocommerce-bikesul-pricing-v2-unified.php`
- Sistema unificado remove hooks conflitantes (linhas 44-54)
- Usa prioridades coordenadas (linha 61)

### 4. **MÉDIO: Problema com "Repeated template lookup queries"**

**Problema**: O fix do WoodMart pode afetar o carregamento dos templates customizados.

**Recomendação**: Verificar se os templates de checkout estão sendo carregados corretamente.

**Teste Necessário**:
```php
// Adicionar log para verificar carregamento de templates
add_action('woocommerce_before_checkout_form', function() {
    error_log('BIKESUL: Checkout form loading - WoodMart compatibility check');
});
```

### 5. **BAIXO: Compatibilidade com "AJAX Product Tabs"**

**Problema**: A correção de AJAX pode interferir com atualizações dinâmicas de preços.

**Status**: Não afeta diretamente o sistema atual, mas monitorar.

## Recomendações de Implementação

### 1. **Atualizar Sistema Unificado (PRIORIDADE ALTA)**

Modificar `woocommerce-bikesul-pricing-v2-unified.php`:

```php
// Adicionar depois da linha 508
add_action('after_setup_theme', function() {
    // Verificar compatibilidade com validação de quantidade do WoodMart
    if (function_exists('woodmart_get_theme_info')) {
        $theme_version = woodmart_get_theme_info('Version');
        
        // Para versões 8.2.7+
        if (version_compare($theme_version, '8.2.7', '>=')) {
            // Adicionar hooks de compatibilidade
            add_filter('woocommerce_cart_item_quantity', 'bikesul_validate_rental_quantity', 10, 3);
            add_filter('woocommerce_get_price_html', 'bikesul_fix_woodmart_price_display', 20, 2);
        }
        
        error_log("BIKESUL UNIFIED: WoodMart version {$theme_version} compatibility applied");
    }
}, 15);

function bikesul_validate_rental_quantity($quantity, $cart_item_key, $cart_item) {
    // Validar quantidade para produtos de aluguel
    if (isset($cart_item['rental_days']) && $cart_item['rental_days'] > 0) {
        // Forçar quantidade mínima de 1 para produtos de aluguel
        return max(1, intval($quantity));
    }
    return $quantity;
}

function bikesul_fix_woodmart_price_display($price, $product) {
    // Verificar se é produto no carrinho com dados de aluguel
    if (is_cart() || is_checkout()) {
        $cart = WC()->cart->get_cart();
        foreach ($cart as $cart_item) {
            if ($cart_item['product_id'] == $product->get_id() && 
                isset($cart_item['rental_price_per_day'])) {
                // Forçar exibição de preço calculado
                $calculated_price = $cart_item['rental_price_per_day'] * $cart_item['rental_days'];
                return wc_price($calculated_price);
            }
        }
    }
    return $price;
}
```

### 2. **Criar Hook de Emergência para Compatibilidade**

Adicionar ao `bikesul-pricing-emergency-fix.php`:

```php
// Depois da linha 294
// ===============================================
// COMPATIBILIDADE WOODMART 8.2.7+
// ===============================================
add_action('wp_loaded', function() {
    if (function_exists('woodmart_get_theme_info')) {
        $version = woodmart_get_theme_info('Version');
        if (version_compare($version, '8.2.7', '>=')) {
            // Desabilitar quantity validation do WoodMart para produtos de aluguel
            add_filter('woodmart_quantity_input_args', 'bikesul_override_quantity_validation', 10, 2);
        }
    }
});

function bikesul_override_quantity_validation($args, $product) {
    // Verificar se é produto de aluguel
    if (is_rental_product($product)) {
        $args['min_value'] = 1;
        $args['max_value'] = 99;
        $args['step'] = 1;
    }
    return $args;
}
```

### 3. **Teste de Compatibilidade Automático**

Atualizar `bikesul-pricing-test-validation.php`:

```php
// Adicionar novo teste depois da linha 252
private function test_woodmart_compatibility() {
    $test_name = "Compatibilidade WoodMart 8.2.7+";
    
    $woodmart_active = function_exists('woodmart_get_theme_info');
    $version_compatible = false;
    $hooks_compatible = true;
    
    if ($woodmart_active) {
        $version = woodmart_get_theme_info('Version');
        $version_compatible = version_compare($version, '8.2.7', '>=');
        
        // Verificar se hooks de compatibilidade estão ativos
        $hooks_compatible = has_filter('woodmart_quantity_input_args', 'bikesul_override_quantity_validation');
    }
    
    $result = $woodmart_active && $version_compatible && $hooks_compatible;
    
    $this->test_results[$test_name] = array(
        'passed' => $result,
        'details' => array(
            'woodmart_active' => $woodmart_active,
            'version_compatible' => $version_compatible,
            'hooks_compatible' => $hooks_compatible,
            'version' => $woodmart_active ? woodmart_get_theme_info('Version') : 'N/A'
        )
    );
    
    error_log("BIKESUL VALIDATOR: $test_name - " . ($result ? 'PASSED' : 'FAILED'));
}
```

## Plano de Implementação

### Fase 1: Correções Críticas (Imediato)
1. ✅ Atualizar sistema unificado com validação de quantidade
2. ✅ Adicionar hooks de compatibilidade WoodMart 8.2.7+
3. ✅ Testar em ambiente de desenvolvimento

### Fase 2: Monitoramento (1-2 semanas)
1. Monitorar logs de erro
2. Verificar comportamento do checkout
3. Testar diferentes cenários de quantidade

### Fase 3: Otimização (Conforme necessário)
1. Ajustar hooks baseado no feedback
2. Otimizar performance se necessário
3. Documentar mudanças

## Status dos Arquivos

| Arquivo | Status | Ação Necessária |
|---------|--------|-----------------|
| `woocommerce-bikesul-pricing-v2-unified.php` | ✅ **ATUALIZADO** | Compatibilidade WoodMart 8.2.7+ implementada |
| `woocommerce-bikesul-pricing.php` | 🔄 **LEGACY** | Manter para compatibilidade |
| `bikesul-pricing-emergency-fix.php` | ✅ **ATUALIZADO** | Hooks de compatibilidade implementados |
| `bikesul-pricing-test-validation.php` | ✅ **ATUALIZADO** | Teste de compatibilidade implementado |
| `bikesul-woodmart-compatibility-monitor.php` | ✅ **NOVO** | Monitor automático criado |
| `woocommerce-insurance-handler.php` | ✅ **OK** | Funcional, monitorar |

## Conclusão

O sistema de preços atual é **compatível** com WoodMart 8.2.7, mas requer **atualizações menores** para garantir funcionamento otimizado. As principais áreas de atenção são:

1. **Validação de quantidade** - Evitar conflitos
2. **Exibição de preços** - Garantir visualização correta
3. **Performance** - Monitorar impacto das correções do tema

**Risco**: 🟡 **BAIXO-MÉDIO** - Sistema funcional, mas otimizações recomendadas.
