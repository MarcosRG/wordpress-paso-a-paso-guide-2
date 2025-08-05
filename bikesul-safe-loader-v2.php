<?php
/**
 * BIKESUL: Carregador Seguro de Componentes v2.0
 * ATUALIZADO: Para usar sistema unificado de pricing
 * COMPATIBLE: WoodMart 8.2.7 y PHP 8.2.7
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

class Bikesul_Safe_Loader_v2 {
    
    private static $instance = null;
    private $loaded_components = array();
    private $load_errors = array();
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('plugins_loaded', array($this, 'load_components'), 10);
        add_action('init', array($this, 'health_check'), 999);
        error_log("BIKESUL SAFE LOADER v2: Initialized");
    }
    
    /**
     * Carrega componentes na ordem correta
     */
    public function load_components() {
        if (!$this->check_dependencies()) {
            return false;
        }
        
        // SISTEMA UNIFICADO - Carrega apenas o novo sistema
        $components = array(
            'bikesul-pricing-emergency-fix.php' => 'Emergency Price Fix (HIGH PRIORITY)',
            'woocommerce-bikesul-pricing-v2-unified.php' => 'Unified Pricing System v2',
            'bikesul-checkout-debug.php' => 'Checkout Debug Tool',
            'woocommerce-bikesul-custom-fields-identifier.php' => 'Custom Fields Identifier',
            'woocommerce-dynamic-order-shortcodes.php' => 'Dynamic Order Shortcodes',
            'woocommerce-fluentcrm-bikesul-smartcodes-v3-final.php' => 'Smart Codes v3'
        );
        
        // DESATIVAR componentes antigos para evitar conflitos
        $this->deactivate_old_components();
        
        foreach ($components as $file => $name) {
            $this->load_component($file, $name);
        }
        
        $this->log_load_summary();
        return true;
    }
    
    /**
     * Desativa componentes antigos que conflitam
     */
    private function deactivate_old_components() {
        $old_files = array(
            'woocommerce-bikesul-pricing.php',
            'woocommerce-insurance-handler.php'
        );
        
        foreach ($old_files as $file) {
            $filepath = get_stylesheet_directory() . '/' . $file;
            if (file_exists($filepath)) {
                error_log("BIKESUL LOADER v2: Skipping old component - $file (replaced by unified system)");
            }
        }
    }
    
    /**
     * Carrega um componente individual
     */
    private function load_component($file, $name) {
        $filepath = get_stylesheet_directory() . '/' . $file;
        
        if (!file_exists($filepath)) {
            $this->load_errors[] = "$name: File not found ($file)";
            error_log("BIKESUL LOADER v2 ERROR: $name file not found - $file");
            return false;
        }
        
        try {
            include_once $filepath;
            $this->loaded_components[] = $name;
            error_log("BIKESUL LOADER v2: $name loaded successfully");
            return true;
        } catch (Exception $e) {
            $this->load_errors[] = "$name: " . $e->getMessage();
            error_log("BIKESUL LOADER v2 ERROR: $name failed - " . $e->getMessage());
            return false;
        } catch (Error $e) {
            $this->load_errors[] = "$name: PHP Error - " . $e->getMessage();
            error_log("BIKESUL LOADER v2 FATAL: $name - " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Verifica dependências necessárias
     */
    private function check_dependencies() {
        // Verificar WooCommerce
        if (!class_exists('WooCommerce')) {
            error_log('BIKESUL LOADER v2 ERROR: WooCommerce is not active');
            return false;
        }
        
        // Verificar versão do PHP
        if (version_compare(PHP_VERSION, '8.0.0', '<')) {
            error_log('BIKESUL LOADER v2 WARNING: PHP version is ' . PHP_VERSION . ' (recommended 8.2.7+)');
        }
        
        // Verificar tema WoodMart
        $theme = wp_get_theme();
        if ($theme->get('Name') === 'WoodMart' || $theme->get('Template') === 'woodmart') {
            $version = $theme->get('Version');
            error_log("BIKESUL LOADER v2: WoodMart theme version {$version} detected");
            
            if (version_compare($version, '8.2.7', '<')) {
                error_log("BIKESUL LOADER v2 WARNING: WoodMart version {$version} may have compatibility issues");
            }
        }
        
        return true;
    }
    
    /**
     * Log resumo de carregamento
     */
    private function log_load_summary() {
        $loaded_count = count($this->loaded_components);
        $error_count = count($this->load_errors);
        
        error_log("BIKESUL LOADER v2 SUMMARY: {$loaded_count} components loaded, {$error_count} errors");
        
        if (!empty($this->load_errors)) {
            error_log("BIKESUL LOADER v2 ERRORS: " . implode('; ', $this->load_errors));
        }
        
        if ($loaded_count > 0) {
            error_log("BIKESUL LOADER v2 SUCCESS: " . implode(', ', $this->loaded_components));
        }
    }
    
    /**
     * Verificação de saúde dos componentes
     */
    public function health_check() {
        $critical_classes = array(
            'Bikesul_Unified_Pricing_System'
        );
        
        $critical_functions = array(
            'bikesul_encontrar_produto_seguro'
        );
        
        $health_status = array();
        
        // Verificar classes
        foreach ($critical_classes as $class) {
            $health_status["class_{$class}"] = class_exists($class);
        }
        
        // Verificar funções
        foreach ($critical_functions as $function) {
            $health_status["function_{$function}"] = function_exists($function);
        }
        
        $all_healthy = !in_array(false, $health_status);
        
        if ($all_healthy) {
            error_log("BIKESUL LOADER v2 HEALTH: ALL SYSTEMS OPERATIONAL");
        } else {
            error_log("BIKESUL LOADER v2 HEALTH: ISSUES DETECTED");
            foreach ($health_status as $item => $status) {
                if (!$status) {
                    error_log("BIKESUL LOADER v2 HEALTH: MISSING - $item");
                }
            }
        }
        
        return $health_status;
    }
    
    /**
     * Retorna estatísticas de carregamento
     */
    public function get_load_stats() {
        return array(
            'loaded_components' => $this->loaded_components,
            'load_errors' => $this->load_errors,
            'success_rate' => count($this->loaded_components) / (count($this->loaded_components) + count($this->load_errors)) * 100
        );
    }
}

// Inicializar apenas se WordPress estiver carregado
if (defined('ABSPATH')) {
    Bikesul_Safe_Loader_v2::get_instance();
}

// Função de compatibilidade para código antigo
if (!function_exists('bikesul_safe_load_components')) {
    function bikesul_safe_load_components() {
        return Bikesul_Safe_Loader_v2::get_instance()->get_load_stats();
    }
}

?>
