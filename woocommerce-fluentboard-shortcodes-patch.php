<?php
/**
 * BIKESUL: Patch para Fluent Board Processar Shortcodes
 * 
 * Este arquivo resolve o problema dos shortcodes Bikesul não serem processados
 * no Fluent Board e outros sistemas que não aplicam filtros WordPress automaticamente.
 * 
 * PROBLEMA RESOLVIDO:
 * - Shortcodes aparecem como texto literal no Fluent Board
 * - Placeholders [order_id] não são resolvidos
 * - Dados não são exibidos corretamente nas tarefas
 * 
 * INSTALAÇÃO:
 * 1. Adicione este arquivo ao seu tema ou plugin
 * 2. Inclua em functions.php: include_once('path/to/this/file.php');
 * 3. Certifique-se de que o arquivo principal de shortcodes também está ativo
 */

// Prevenir acesso direto
if (!defined('ABSPATH')) {
    exit;
}

// ===============================================
// 1. FILTROS ESPECÍFICOS PARA FLUENT BOARD
// ===============================================

/**
 * Aplicar processamento de shortcodes em conteúdo do FluentBoard
 */
add_filter('fluent_board/task_content', 'bikesul_process_fluentboard_shortcodes', 20);
add_filter('fluent_board/comment_content', 'bikesul_process_fluentboard_shortcodes', 20);
add_filter('fluent_board/task_description', 'bikesul_process_fluentboard_shortcodes', 20);

/**
 * Também aplicar em FluentCRM para compatibilidade
 */
add_filter('fluentcrm/email_content', 'bikesul_process_fluentboard_shortcodes', 20);
add_filter('fluentcrm/campaign_content', 'bikesul_process_fluentboard_shortcodes', 20);

function bikesul_process_fluentboard_shortcodes($content) {
    // Primeiro, processar placeholders dinâmicos
    $content = bikesul_resolve_dynamic_placeholders($content);
    
    // Depois, aplicar os shortcodes do WordPress
    $content = do_shortcode($content);
    
    return $content;
}

/**
 * Função para resolver placeholders [order_id] no contexto do FluentBoard
 */
function bikesul_resolve_dynamic_placeholders($content) {
    // Buscar por padrões de shortcodes Bikesul com [order_id]
    $pattern = '/\[bikesul_([^[\]]*)\s+id=["\']?\[order_id\]["\']?([^[\]]*)\]/';
    
    if (preg_match_all($pattern, $content, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $full_shortcode = $match[0];
            $shortcode_name = $match[1];
            $other_attrs = isset($match[2]) ? $match[2] : '';
            
            // Tentar obter order_id do contexto atual
            $order_id = bikesul_get_current_order_id_from_context();
            
            if ($order_id) {
                // Substituir [order_id] pelo ID real
                $processed_shortcode = str_replace('[order_id]', $order_id, $full_shortcode);
                $content = str_replace($full_shortcode, $processed_shortcode, $content);
                
                // Log para debug
                error_log("BIKESUL FluentBoard: Processando shortcode - Original: $full_shortcode, Processado: $processed_shortcode");
            } else {
                // Se não conseguir resolver, deixar uma mensagem de debug
                error_log("BIKESUL FluentBoard: Não foi possível resolver order_id para: $full_shortcode");
            }
        }
    }
    
    return $content;
}

/**
 * Função específica para obter order_id no contexto do FluentBoard
 */
function bikesul_get_current_order_id_from_context() {
    // 1. Verificar se foi definido manualmente
    if (isset($GLOBALS['bikesul_current_order_id'])) {
        return intval($GLOBALS['bikesul_current_order_id']);
    }
    
    // 2. Verificar sessão
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }
    if (isset($_SESSION['current_order_id'])) {
        return intval($_SESSION['current_order_id']);
    }
    
    // 3. Verificar cookie
    if (isset($_COOKIE['bikesul_current_order'])) {
        return intval($_COOKIE['bikesul_current_order']);
    }
    
    // 4. Verificar parâmetros da requisição
    if (isset($_GET['order_id'])) {
        return intval($_GET['order_id']);
    }
    
    if (isset($_POST['order_id'])) {
        return intval($_POST['order_id']);
    }
    
    // 5. Tentar extrair do contexto do FluentCRM/FluentBoard
    $order_id = bikesul_extract_order_from_fluent_context();
    if ($order_id) {
        return $order_id;
    }
    
    // 6. Último pedido do usuário atual como fallback
    if (is_user_logged_in()) {
        $customer = new WC_Customer(get_current_user_id());
        $orders = wc_get_orders(array(
            'customer' => $customer->get_id(),
            'limit' => 1,
            'orderby' => 'date',
            'order' => 'DESC',
            'status' => array('processing', 'completed', 'on-hold')
        ));
        
        if (!empty($orders)) {
            return $orders[0]->get_id();
        }
    }
    
    return null;
}

/**
 * Extrair order_id do contexto específico do FluentCRM/FluentBoard
 */
function bikesul_extract_order_from_fluent_context() {
    // Verificar se estamos em um contexto de automação FluentCRM
    if (function_exists('fluentCrm')) {
        // Tentar obter da variável global do FluentCRM
        global $fluentCrmCurrentContact, $fluentCrmCurrentCampaign;
        
        if (isset($fluentCrmCurrentContact)) {
            // Buscar último pedido deste contato
            $orders = wc_get_orders(array(
                'meta_query' => array(
                    array(
                        'key' => '_billing_email',
                        'value' => $fluentCrmCurrentContact->email,
                        'compare' => '='
                    )
                ),
                'limit' => 1,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            
            if (!empty($orders)) {
                return $orders[0]->get_id();
            }
        }
    }
    
    // Verificar se estamos em um hook de pedido WooCommerce
    global $wp_filter;
    if (isset($wp_filter['woocommerce_order_status_changed'])) {
        // Tentar obter do contexto do hook
        $current_filter = current_filter();
        if (strpos($current_filter, 'order') !== false) {
            // Lógica adicional para extrair order_id do contexto
        }
    }
    
    return null;
}

// ===============================================
// 2. HOOKS PARA CAPTURAR CONTEXTO AUTOMÁTICO
// ===============================================

/**
 * Capturar order_id quando FluentCRM processa automações
 */
add_action('fluentcrm/campaign_before_send', 'bikesul_capture_fluentcrm_order_context', 10, 2);
add_action('fluentcrm/email_before_send', 'bikesul_capture_fluentcrm_order_context', 10, 2);

function bikesul_capture_fluentcrm_order_context($campaign, $subscriber) {
    if (isset($subscriber->email)) {
        // Buscar pedidos recentes deste email
        $orders = wc_get_orders(array(
            'meta_query' => array(
                array(
                    'key' => '_billing_email',
                    'value' => $subscriber->email,
                    'compare' => '='
                )
            ),
            'limit' => 1,
            'orderby' => 'date',
            'order' => 'DESC',
            'date_created' => '>' . (time() - 30 * 24 * 60 * 60) // Últimos 30 dias
        ));
        
        if (!empty($orders)) {
            $order_id = $orders[0]->get_id();
            bikesul_set_current_order_id($order_id);
            error_log("BIKESUL FluentCRM: Order ID $order_id capturado para {$subscriber->email}");
        }
    }
}

/**
 * Capturar contexto quando WooCommerce muda status de pedido
 */
add_action('woocommerce_order_status_changed', 'bikesul_capture_woocommerce_context', 5, 3);

function bikesul_capture_woocommerce_context($order_id, $old_status, $new_status) {
    // Definir o order_id globalmente para uso em automações subsequentes
    bikesul_set_current_order_id($order_id);
    
    // Log para debug
    error_log("BIKESUL WooCommerce: Order ID $order_id capturado na mudança de status $old_status -> $new_status");
}

// ===============================================
// 3. MELHORIAS NA FUNÇÃO DE DEFINIR ORDER_ID
// ===============================================

/**
 * Versão melhorada da função para definir order_id atual
 */
if (!function_exists('bikesul_set_current_order_id')) {
    function bikesul_set_current_order_id($order_id) {
        $order_id = intval($order_id);
        
        // Definir em variável global
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        
        // Definir em sessão
        if (session_status() === PHP_SESSION_NONE) {
            @session_start();
        }
        $_SESSION['current_order_id'] = $order_id;
        
        // Definir cookie com validade de 2 horas
        @setcookie('bikesul_current_order', $order_id, time() + 7200, '/');
        
        // Definir em meta temporário se temos usuário logado
        if (is_user_logged_in()) {
            update_user_meta(get_current_user_id(), '_temp_bikesul_order_id', $order_id);
        }
        
        // Log para debug
        error_log("BIKESUL: Order ID $order_id definido em todos os contextos");
    }
}

// ===============================================
// 4. SHORTCODE DE DEBUG PARA FLUENT BOARD
// ===============================================

/**
 * Shortcode para debugar problemas no FluentBoard
 */
add_shortcode('bikesul_debug_fluentboard', 'bikesul_debug_fluentboard_context');

function bikesul_debug_fluentboard_context($atts) {
    $atts = shortcode_atts(array(
        'show_all' => 'no'
    ), $atts);
    
    $debug_info = array(
        'current_order_id' => bikesul_get_current_order_id_from_context(),
        'global_order' => $GLOBALS['bikesul_current_order_id'] ?? 'não definido',
        'session_order' => $_SESSION['current_order_id'] ?? 'não definido',
        'cookie_order' => $_COOKIE['bikesul_current_order'] ?? 'não definido',
        'current_filter' => current_filter(),
        'is_fluentcrm_active' => function_exists('fluentCrm') ? 'sim' : 'não',
        'current_user_id' => get_current_user_id(),
        'timestamp' => current_time('mysql')
    );
    
    if ($atts['show_all'] === 'yes') {
        $debug_info['get_params'] = $_GET;
        $debug_info['post_params'] = $_POST;
        $debug_info['server_uri'] = $_SERVER['REQUEST_URI'] ?? 'não definido';
    }
    
    return '<div style="background: #f0f0f0; padding: 10px; margin: 10px 0; font-family: monospace; font-size: 12px;"><strong>BIKESUL DEBUG:</strong><pre>' . print_r($debug_info, true) . '</pre></div>';
}

/**
 * Shortcode para forçar definição de order_id (para testes)
 */
add_shortcode('bikesul_force_order_id', 'bikesul_force_order_id');

function bikesul_force_order_id($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);
    
    if ($atts['id']) {
        bikesul_set_current_order_id($atts['id']);
        return "<!-- BIKESUL: Order ID {$atts['id']} definido forçadamente -->";
    }
    
    return "<!-- BIKESUL: Erro - ID requerido -->";
}

// ===============================================
// 5. FILTROS ADICIONAIS PARA COMPATIBILIDADE
// ===============================================

/**
 * Garantir que shortcodes sejam processados em widgets e outros contextos
 */
add_filter('widget_text', 'bikesul_process_fluentboard_shortcodes', 20);
add_filter('the_content', 'bikesul_process_fluentboard_shortcodes', 9);
add_filter('comment_text', 'bikesul_process_fluentboard_shortcodes', 20);

/**
 * Processar shortcodes em campos customizados
 */
add_filter('get_post_metadata', 'bikesul_process_meta_shortcodes', 20, 4);

function bikesul_process_meta_shortcodes($value, $object_id, $meta_key, $single) {
    // Só processar em campos que podem conter shortcodes
    $shortcode_fields = array('description', 'content', 'message', 'body', 'text');
    
    $should_process = false;
    foreach ($shortcode_fields as $field) {
        if (strpos($meta_key, $field) !== false) {
            $should_process = true;
            break;
        }
    }
    
    if ($should_process && is_string($value) && strpos($value, '[bikesul_') !== false) {
        return bikesul_process_fluentboard_shortcodes($value);
    }
    
    return $value;
}

// ===============================================
// 6. INICIALIZAÇÃO E LOGS
// ===============================================

/**
 * Inicializar o sistema quando WordPress carrega
 */
add_action('init', 'bikesul_fluentboard_patch_init');

function bikesul_fluentboard_patch_init() {
    // Verificar se os shortcodes principais estão carregados
    if (!shortcode_exists('bikesul_customer_name')) {
        error_log('BIKESUL FluentBoard Patch: ATENÇÃO - Shortcodes principais não estão carregados!');
        
        // Tentar carregar o arquivo principal
        $main_file = get_template_directory() . '/woocommerce-dynamic-order-shortcodes.php';
        if (file_exists($main_file)) {
            include_once($main_file);
            error_log('BIKESUL FluentBoard Patch: Arquivo principal carregado automaticamente');
        }
    }
    
    error_log('BIKESUL FluentBoard Patch: Sistema inicializado com sucesso');
}

/**
 * Hook de debug para mostrar quando shortcodes são processados
 * DESACTIVADO para evitar debug automático en producción
 */
// add_action('wp_footer', 'bikesul_debug_shortcode_processing');

function bikesul_debug_shortcode_processing() {
    if (defined('WP_DEBUG') && WP_DEBUG && current_user_can('manage_options')) {
        $current_order = bikesul_get_current_order_id_from_context();
        echo "<!-- BIKESUL Debug: Current Order ID = $current_order -->";
    }
}

// Log final para confirmar carregamento
error_log("BIKESUL: Patch para FluentBoard carregado com sucesso - " . current_time('mysql'));

?>

<!--
GUIA DE USO DO PATCH FLUENT BOARD:

1. INSTALAÇÃO:
   - Copie este arquivo para seu tema ativo
   - Adicione no functions.php: include_once('woocommerce-fluentboard-shortcodes-patch.php');
   - Certifique-se de que o arquivo principal de shortcodes também está ativo

2. TESTE BÁSICO:
   Adicione este shortcode em uma tarefa do FluentBoard para testar:
   [bikesul_debug_fluentboard]

3. FORÇAR ORDER ID PARA TESTE:
   [bikesul_force_order_id id="123"]
   [bikesul_customer_name id="[order_id]"]

4. CONFIGURAÇÃO NO FLUENTCRM:
   - Trigger: "WooCommerce Order Status Changed"
   - Condição: Status = "processing" ou "completed"
   - Ação: "Create FluentBoard Task" com o template de shortcodes

5. TEMPLATE RECOMENDADO PARA FLUENTBOARD:
   Título: Pedido #[order_id] - [bikesul_customer_name id="[order_id]"]
   
   Descrição:
   Cliente: [bikesul_customer_name id="[order_id]"] ([bikesul_customer_email id="[order_id]"])
   Período: [bikesul_rental_dates id="[order_id]"]
   Total de dias: [bikesul_rental_days id="[order_id]"] dias
   Horários: [bikesul_rental_times id="[order_id]"]
   
   Bicicletas:
   [bikesul_bikes_list id="[order_id]" format="simple"]
   
   Seguro:
   [bikesul_insurance_info id="[order_id]" field="name"] - [bikesul_insurance_info id="[order_id]" field="price"]

6. RESOLUÇÃO DE PROBLEMAS:
   - Se os shortcodes ainda aparecem como texto, adicione: [bikesul_debug_fluentboard show_all="yes"]
   - Verifique os logs de erro do WordPress para mensagens BIKESUL
   - Certifique-se de que o trigger está configurado corretamente

7. LOGS DE DEBUG:
   - Ative WP_DEBUG = true no wp-config.php
   - Verifique /wp-content/debug.log para mensagens do sistema
-->
