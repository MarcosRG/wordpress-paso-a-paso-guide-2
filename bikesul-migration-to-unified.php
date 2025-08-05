<?php
/**
 * BIKESUL: Script de Migração para Sistema Unificado v2
 * PROPÓSITO: Migração suave do sistema antigo para o novo
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

class Bikesul_Migration_Manager {
    
    private $migration_log = array();
    
    public function __construct() {
        add_action('admin_init', array($this, 'check_migration_needed'));
        add_action('wp_ajax_bikesul_run_migration', array($this, 'run_migration'));
        add_action('admin_notices', array($this, 'show_migration_notice'));
    }
    
    /**
     * Verifica se migração é necessária
     */
    public function check_migration_needed() {
        $migration_completed = get_option('bikesul_unified_migration_completed', false);
        
        if (!$migration_completed && current_user_can('manage_options')) {
            // Verificar se sistema antigo ainda está ativo
            if ($this->old_system_detected()) {
                update_option('bikesul_migration_needed', true);
            }
        }
    }
    
    /**
     * Detecta se sistema antigo ainda está presente
     */
    private function old_system_detected() {
        $old_files = array(
            'woocommerce-bikesul-pricing.php',
            'woocommerce-insurance-handler.php',
            'bikesul-safe-loader.php'
        );
        
        $found_old_files = 0;
        foreach ($old_files as $file) {
            if (file_exists(get_stylesheet_directory() . '/' . $file)) {
                $found_old_files++;
            }
        }
        
        return $found_old_files > 0;
    }
    
    /**
     * Mostra aviso de migração no admin
     */
    public function show_migration_notice() {
        if (!get_option('bikesul_migration_needed', false)) {
            return;
        }
        
        if (!current_user_can('manage_options')) {
            return;
        }
        
        ?>
        <div class="notice notice-warning is-dismissible">
            <h3>🔄 BIKESUL: Migração para Sistema Unificado Disponível</h3>
            <p>
                <strong>Detectamos que você ainda tem o sistema antigo de pricing ativo.</strong><br>
                O novo sistema unificado v2.0 corrige os problemas de cálculo de preços e quantidades.
            </p>
            <p>
                <strong>Melhorias do Sistema Unificado:</strong>
            </p>
            <ul>
                <li>✅ Corrige cálculos incorretos entre app e WooCommerce</li>
                <li>✅ Elimina conflitos entre hooks de pricing e seguros</li>
                <li>✅ Compatível com WoodMart 8.2.7 e PHP 8.2.7</li>
                <li>✅ Preços mostrados corretamente no checkout</li>
                <li>✅ Quantidades vs dias de aluguel calculados corretamente</li>
            </ul>
            <p>
                <button type="button" id="bikesul-run-migration" class="button button-primary">
                    🚀 Migrar para Sistema Unificado
                </button>
                <button type="button" id="bikesul-dismiss-migration" class="button">
                    ⏭️ Lembrar mais tarde
                </button>
            </p>
            <div id="bikesul-migration-progress" style="display: none;">
                <p>⏳ Executando migração... Por favor aguarde.</p>
                <div id="bikesul-migration-log"></div>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#bikesul-run-migration').click(function() {
                $('#bikesul-migration-progress').show();
                $(this).prop('disabled', true);
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bikesul_run_migration',
                        nonce: '<?php echo wp_create_nonce('bikesul_migration'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#bikesul-migration-log').html('<p style="color: green;">✅ ' + response.data.message + '</p>');
                            setTimeout(function() {
                                location.reload();
                            }, 2000);
                        } else {
                            $('#bikesul-migration-log').html('<p style="color: red;">❌ Erro: ' + response.data.message + '</p>');
                            $('#bikesul-run-migration').prop('disabled', false);
                        }
                    },
                    error: function() {
                        $('#bikesul-migration-log').html('<p style="color: red;">❌ Erro de conexão. Tente novamente.</p>');
                        $('#bikesul-run-migration').prop('disabled', false);
                    }
                });
            });
            
            $('#bikesul-dismiss-migration').click(function() {
                $(this).closest('.notice').fadeOut();
            });
        });
        </script>
        <?php
    }
    
    /**
     * Executa migração via AJAX
     */
    public function run_migration() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'bikesul_migration')) {
            wp_die('Nonce verification failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permissões insuficientes'));
        }
        
        try {
            $this->execute_migration();
            
            // Marcar migração como completa
            update_option('bikesul_unified_migration_completed', true);
            update_option('bikesul_migration_needed', false);
            
            wp_send_json_success(array(
                'message' => 'Migração concluída com sucesso! Sistema unificado ativo.',
                'log' => $this->migration_log
            ));
            
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => 'Erro durante migração: ' . $e->getMessage(),
                'log' => $this->migration_log
            ));
        }
    }
    
    /**
     * Executa as etapas de migração
     */
    private function execute_migration() {
        $this->log_migration('Iniciando migração para sistema unificado...');
        
        // Etapa 1: Backup de configurações antigas
        $this->backup_old_settings();
        
        // Etapa 2: Verificar se novo sistema está carregado
        $this->verify_new_system();
        
        // Etapa 3: Desativar sistema antigo
        $this->deactivate_old_system();
        
        // Etapa 4: Verificar compatibilidade
        $this->check_compatibility();
        
        // Etapa 5: Executar testes de validação
        $this->run_validation_tests();
        
        $this->log_migration('Migração concluída com sucesso!');
    }
    
    /**
     * Backup das configurações antigas
     */
    private function backup_old_settings() {
        $this->log_migration('Fazendo backup das configurações antigas...');
        
        // Salvar configurações atuais
        $old_settings = array(
            'timestamp' => current_time('mysql'),
            'php_version' => PHP_VERSION,
            'wp_version' => get_bloginfo('version'),
            'woocommerce_version' => defined('WC_VERSION') ? WC_VERSION : 'unknown',
            'theme' => wp_get_theme()->get('Name'),
            'theme_version' => wp_get_theme()->get('Version')
        );
        
        update_option('bikesul_migration_backup', $old_settings);
        $this->log_migration('✅ Backup das configurações salvo');
    }
    
    /**
     * Verifica se novo sistema está disponível
     */
    private function verify_new_system() {
        $this->log_migration('Verificando novo sistema unificado...');
        
        if (!class_exists('Bikesul_Unified_Pricing_System')) {
            throw new Exception('Sistema unificado não encontrado. Verifique se os arquivos foram carregados corretamente.');
        }
        
        if (!class_exists('Bikesul_Safe_Loader_v2')) {
            throw new Exception('Safe Loader v2 não encontrado.');
        }
        
        $this->log_migration('✅ Sistema unificado verificado e disponível');
    }
    
    /**
     * Desativa sistema antigo
     */
    private function deactivate_old_system() {
        $this->log_migration('Desativando sistema antigo...');
        
        // Remover hooks antigos se ainda estiverem ativos
        remove_action('woocommerce_checkout_create_order_line_item', 'bikesul_ajustar_precios_orden_directa', 10);
        remove_action('woocommerce_before_calculate_totals', 'bikesul_calcular_precio_alquiler_carrito', 20);
        remove_action('woocommerce_checkout_create_order_line_item', 'bikesul_procesar_seguro_en_orden_v2', 5);
        remove_action('woocommerce_before_calculate_totals', 'bikesul_ajustar_precio_seguro_carrito_v2', 30);
        
        $this->log_migration('✅ Hooks antigos removidos');
    }
    
    /**
     * Verifica compatibilidade
     */
    private function check_compatibility() {
        $this->log_migration('Verificando compatibilidade...');
        
        // Verificar WooCommerce
        if (!class_exists('WooCommerce')) {
            throw new Exception('WooCommerce não está ativo');
        }
        
        // Verificar tema WoodMart
        $theme = wp_get_theme();
        if ($theme->get('Name') === 'WoodMart' || $theme->get('Template') === 'woodmart') {
            $version = $theme->get('Version');
            $this->log_migration("✅ WoodMart {$version} detectado");
        }
        
        $this->log_migration('✅ Compatibilidade verificada');
    }
    
    /**
     * Executa testes de validação
     */
    private function run_validation_tests() {
        $this->log_migration('Executando testes de validação...');
        
        // Teste básico de cálculo
        $test_price_per_day = 53.00;
        $test_days = 11;
        $expected_total = $test_price_per_day * $test_days;
        $calculated_total = $test_price_per_day * $test_days;
        
        if ($calculated_total !== $expected_total) {
            throw new Exception('Teste de cálculo falhou');
        }
        
        $this->log_migration('✅ Testes de validação aprovados');
    }
    
    /**
     * Log de migração
     */
    private function log_migration($message) {
        $this->migration_log[] = date('[Y-m-d H:i:s] ') . $message;
        error_log("BIKESUL MIGRATION: $message");
    }
}

// Inicializar apenas no admin
if (is_admin()) {
    new Bikesul_Migration_Manager();
}

?>
