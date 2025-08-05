<?php
/**
 * Enqueue script and styles for child theme
 */
function woodmart_child_enqueue_styles() {
	wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/style.css', array( 'woodmart-style' ), woodmart_get_theme_info( 'Version' ) );
}
add_action( 'wp_enqueue_scripts', 'woodmart_child_enqueue_styles', 10010 );

function custom_login_style() {
    echo '<style>
        body.login { background: #222 !important; }
        .login h1 a { background-image: url("https://bikesulgest.com/wp-content/uploads/2025/02/Branco-1.png") !important; background-size: contain; width: 300px; height: 100px; }
        .login form { background: #fff; border-radius: 10px; padding: 20px; }
        .wp-core-ui .button-primary { background: #0073aa; border-color: #0073aa; }
    </style>';
}
add_action('login_head', 'custom_login_style');

// Cambiar el logo de WordPress en la barra superior del admin
function custom_admin_bar_logo() {
    echo '<style>
        /* Ocultar el logo de WordPress */
        #wpadminbar #wp-admin-bar-wp-logo {
            display: none !important;
        }

        /* Agregar un nuevo logo en su lugar */
        #wpadminbar #wp-admin-bar-site-name > .ab-item {
            background: url(' . get_stylesheet_directory_uri() . '/images/cropped-Tours.png) no-repeat center !important;
            background-size: contain !important;
            padding-left: 40px !important; /* Ajustar espacio para que se vea bien */
        }
    </style>';
}
add_action('admin_head', 'custom_admin_bar_logo');


// 3. Quitar el aviso de versi贸n de WordPress en el footer del admin
function remove_footer_admin() {
    return '';
}
add_filter('admin_footer_text', 'remove_footer_admin');

// 4. Quitar el n煤mero de versi贸n de WordPress en el footer del admin
function remove_footer_version() {
    return '';
}
add_filter('update_footer', 'remove_footer_version', 9999);

add_filter('nonce_life', function() {
    return 24 * HOUR_IN_SECONDS; // 24 horas en segundos
});

//finalizar pagamento// Cambiar el texto del botón en el checkout
add_filter('woocommerce_order_button_text', function() {
    return 'Finalizar pagamento';
});

//swtches
//add_filter('woocommerce_loop_add_to_cart_args', //'disable_xt_swatches_on_archives', 10, 2);
//function disable_xt_swatches_on_archives($args, $product) {
//    if (is_shop() || is_product_category() || is_product_tag() || is_search()) //{
        // Desactivar los swatches en las páginas de archivo
     ///  remove_action('woocommerce_after_shop_loop_item_title', //'xt_woocommerce_variation_swatches', 20);
  //  }
  //  return $args;
//}


//redirect
add_action('wp_footer', function() {
    if (is_shop() || is_product_category() || is_product_tag() || is_search()) { ?>
        <script>
            document.addEventListener("DOMContentLoaded", function() {
                // Esperar a que Elementor cargue los productos con AJAX
                setTimeout(() => {
                    document.querySelectorAll('.elementor-widget-woocommerce .add_to_cart_button').forEach(button => {
                        let productUrl = button.closest('.product').querySelector('a').href;
                        
                        // Crear nuevo botón de redirección
                        let newButton = document.createElement('a');
                        newButton.href = productUrl;
                        newButton.textContent = "Reservar / Comprar";
                        newButton.classList.add('button'); 

                        // Reemplazar el botón original
                        button.replaceWith(newButton);
                    });
                }, 1000); // Espera un segundo para que Elementor cargue los productos
            });
        </script>
    <?php }
});

//hide tabs product
add_filter( 'woocommerce_product_tabs', 'ocultar_pestanas_woocommerce', 98 );
function ocultar_pestanas_woocommerce( $tabs ) {
    unset( $tabs['description'] );      	// Elimina la pestaña de descripción
    unset( $tabs['reviews'] ); 			// Elimina la pestaña de valoraciones
    unset( $tabs['additional_information'] );  	// Elimina la pestaña de información adicional
    return $tabs;
}

//campos
add_action('woocommerce_thankyou', 'sincronizar_aluguer_fluentcrm', 10, 1);

function sincronizar_aluguer_fluentcrm($order_id) {
    if (!$order_id) return;

    $pedido = wc_get_order($order_id);
    if (!$pedido) return;

    $email = $pedido->get_billing_email();
    $nome = $pedido->get_billing_first_name();
    $apelido = $pedido->get_billing_last_name();
    $telefone = $pedido->get_billing_phone();
    $morada = $pedido->get_billing_address_1();
    $cidade = $pedido->get_billing_city();
    $estado = $pedido->get_billing_state();
    $pais = $pedido->get_billing_country();
    $codigopostal = $pedido->get_billing_postcode();

    // Verifica se já existe o contacto
    $contacto = FluentCrm\App\Models\Subscriber::where('email', $email)->first();

    if (!$contacto) {
        // Cria novo contacto
        $contacto = FluentCrm\App\Models\Subscriber::create([
            'email'        => $email,
            'first_name'   => $nome,
            'last_name'    => $apelido,
            'status'       => 'subscribed',
        ]);
    }

    // Captura os dados personalizados do aluguer
    $dados_aluguer = [
        'bicicleta' => '',
        'local_coordenadas' => '',
        'checking' => '',
        'checkout' => '',
        'extras' => '',
        'notas' => '',
        'canal' => '',
        'responsavel' => '',
        'numero_dias' => '',
        'valor_euros' => '',
        'situacao' => '',
        'status' => '',
        'descriminacao_de_contas' => ''
    ];

    // Podes ajustar aqui se esses dados estiverem salvos como metadados do pedido
    foreach ($pedido->get_items() as $item) {
        $product_meta = $item->get_meta_data();
        foreach ($product_meta as $meta) {
            $key = $meta->key;
            $value = $meta->value;

            if (array_key_exists($key, $dados_aluguer)) {
                $dados_aluguer[$key] = $value;
            }
        }
    }

    // Atualiza todos os dados no contacto
    $contacto->update(array_merge([
        'phone' => $telefone,
        'billing_address' => $morada,
        'billing_city' => $cidade,
        'billing_state' => $estado,
        'billing_country' => $pais,
        'billing_postcode' => $codigopostal,
    ], $dados_aluguer));

    // Recolhe produtos
    $produtos = [];
    foreach ($pedido->get_items() as $item) {
        $produtos[] = [
            'product_id'   => $item->get_product_id(),
            'product_name' => $item->get_name(),
            'quantity'     => $item->get_quantity(),
            'price'        => (float) $item->get_total(),
        ];
    }

    // Registra a compra para aparecer no Overview
    do_action('fluentcrm_track_purchase', [
        'source'             => 'woocommerce',
        'source_id'          => $order_id,
        'email'              => $email,
        'first_name'         => $nome,
        'last_name'          => $apelido,
        'name'               => $nome . ' ' . $apelido,
        'total_order_count'  => 1,
        'total_order_value'  => (float) $pedido->get_total(),
        'currency'           => $pedido->get_currency(),
        'order_date'         => $pedido->get_date_created()->format('Y-m-d H:i:s'),
        'products'           => $produtos
    ]);
}


##stages
// 1) Programar el cron solo si no está programado
add_action('wp', function () {
    if (!wp_next_scheduled('mover_tarefas_alugueres')) {
        wp_schedule_event(time(), 'twicedaily', 'mover_tarefas_alugueres');
    }

    // Opcional: ejecución manual por URL
    if (isset($_GET['forzar_mover'])) {
        error_log("🔧 Ejecutando manualmente mover_tarefas_alugueres");
        do_action('mover_tarefas_alugueres');
    }
});

// 2) Callback principal
add_action('mover_tarefas_alugueres', function () {
    // Verificamos carga del plugin
    if (!class_exists(\FluentBoards\App\Models\Stage::class) || !class_exists(\FluentBoards\App\Models\Task::class)) {
        error_log('🚫 FluentBoards no cargó Stage o Task.');
        return;
    }

    $board_id = 1; // ID del board "Alugueres"

    // Buscar etapas por nombre
    $stageEntregue = \FluentBoards\App\Models\Stage::where('board_id', $board_id)->where('title', 'entregue')->first();
    $stageNoDia    = \FluentBoards\App\Models\Stage::where('board_id', $board_id)->where('title', 'Receber no Dia')->first();
    $stageDoisDias = \FluentBoards\App\Models\Stage::where('board_id', $board_id)->where('title', 'Receber Em Dois Dias')->first();

    if (!$stageEntregue || !$stageNoDia || !$stageDoisDias) {
        error_log('🚫 Faltan etapas necesarias.');
        return;
    }

    // Tareas en la etapa "entregue"
    $tarefas = \FluentBoards\App\Models\Task::where('stage_id', $stageEntregue->id)->where('board_id', $board_id)->get();

    if ($tarefas->isEmpty()) {
        error_log('ℹ️ No hay tareas en "entregue".');
        return;
    }

    foreach ($tarefas as $tarefa) {
        // Usar la fecha due_at del objeto tarea
        $dataEntrega = $tarefa->due_at;

        if (!$dataEntrega) {
            error_log("⏭️ Tarea ID {$tarefa->id} sin 'due_at'.");
            continue;
        }

        $fecha = DateTime::createFromFormat('Y-m-d H:i:s', $dataEntrega);
        if (!$fecha) {
            error_log("❓ Tarea ID {$tarefa->id} tiene fecha inválida: {$dataEntrega}");
            continue;
        }
        $fecha->setTime(0, 0); // Ignorar hora para comparar solo fechas

        $hoy = new DateTime(date('Y-m-d'));
        $diffDias = (int)$hoy->diff($fecha)->format('%r%a');
        error_log("🔎 Tarea ID {$tarefa->id}: fecha {$dataEntrega}, diferencia {$diffDias} días");

        if ($diffDias === 1) {
            $tarefa->stage_id = $stageNoDia->id;
            $tarefa->save();
            error_log("✅ Movida tarea ID {$tarefa->id} a 'Receber no Dia'");
        } elseif ($diffDias === 2) {
            $tarefa->stage_id = $stageDoisDias->id;
            $tarefa->save();
            error_log("✅ Movida tarea ID {$tarefa->id} a 'Receber Em Dois Dias'");
        } else {
            error_log("📌 Tarea ID {$tarefa->id} no se mueve (diferencia: {$diffDias})");
        }
    }
});

// 3) Limpiar cron al desactivar el tema/plugin
register_deactivation_hook(__FILE__, function () {
    $timestamp = wp_next_scheduled('mover_tarefas_alugueres');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'mover_tarefas_alugueres');
    }
});

##forzar mover
add_action('init', function() {
  if (isset($_GET['forzar_mover'])) {
       error_log('🔧 Ejecutando sin current_user_can');
      do_action('mover_tarefas_alugueres');
       echo "Ejecutado manual.";
     exit;
   }
});

//horasypopup
// 1. Registrar todas las cadenas traducibles para WPML
//add_action('init', function () {
    // Textos de seguros
//    do_action('wpml_register_single_string', 'Seguros', 'Titulo Seguro Basico'//, 'Seguro Basico de Acidentes Pessoais e Contra Terceiros');
//   do_action('wpml_register_single_string', 'Seguros', 'Texto Seguro Basico //Intro', 'O aluguer inclui Seguro de Responsabilidade Civil e Acidente //Pessoal com as seguintes coberturas:');
//    do_action('wpml_register_single_string', 'Seguros', 'Texto Seguro Basico //Rodape', '* Franquias: 50 EUR para despesas medicas ** Franquias: 10% //(Danos Materiais) Minimo: 125 EUR, Máximo: 500 EUR');
//    do_action('wpml_register_single_string', 'Seguros', 'Titulo Seguro //Premium', 'Seguro PREMIUM');
//    do_action('wpml_register_single_string', 'Seguros', 'Texto Seguro Premium'//, 'Inclui seguro de acidentes pessoais, seguro de terceiros e ainda:

//Oferecemos um seguro opcional que pode ser contratado por uma pequena e competitiva quantia, a qual, na maioria dos casos, e significativamente inferior a franquia do seu seguro pessoal de ferias. Este seguro cobre danos acidentais leves na pintura da bicicleta, componentes, rodas, pneus, etc., ate ao valor de €200. Inclui também a oferta da camara de ar fornecida com a bicicleta no caso de um furo.

//Na podemos assegurar contra roubo, perda total da bicicleta, danos graves em caso de acidente ou responsabilidade de terceiros. Por favor, verifique a sua propria apólice de seguro de ferias, pois na maioria dos casos, ela o cobrira no infeliz evento de um acidente grave ou roubo.');

    // Textos de horas
 //   do_action('wpml_register_single_string', 'Horas', 'Hora de Recolha', 'Hora de Recolha');
//    do_action('wpml_register_single_string', 'Horas', 'Hora de entrega', 'Hora de entrega');
//});


// 2. Mostrar popups y selector de horas con textos traducibles y popups modales
//add_action('woocommerce_before_add_to_cart_button', //'mostrar_popups_y_horas_en_alugueres');
///function mostrar_popups_y_horas_en_alugueres() {
 //   global $product;

 //   if (has_term('alugueres', 'product_cat', $product->get_id())) {

        // Obtener traducciones
   //     $titulo_basico = apply_filters('wpml_translate_single_string', 'Seguro Basico de Acidentes Pessoais e Contra Terceiros', 'Seguros', 'Titulo Seguro Basico');
  //      $intro_basico  = apply_filters('wpml_translate_single_string', 'O aluguer inclui Seguro de Responsabilidade Civil e Acidente Pessoal com as seguintes coberturas:', 'Seguros', 'Texto Seguro Basico Intro');
  //      $rodape_basico = apply_filters('wpml_translate_single_string', '* Franquias: 50 EUR para despesas medicas ** Franquias: 10% (Danos Materiais) Minimo: 125 EUR, Maximo: 500 EUR', 'Seguros', 'Texto Seguro Basico Rodape');
   //     $titulo_premium = apply_filters('wpml_translate_single_string', 'Seguro PREMIUM', 'Seguros', 'Titulo Seguro Premium');
   //     $texto_premium  = apply_filters('wpml_translate_single_string', 'Inclui seguro de acidentes pessoais, seguro de terceiros e ainda:

//Oferecemos um seguro opcional que pode ser contratado por uma pequena e competitiva quantia, a qual, na maioria dos casos, e significativamente inferior a franquia do seu seguro pessoal de ferias. Este seguro cobre danos acidentais leves na pintura da bicicleta, componentes, rodas, pneus, etc., ate ao valor de 200 EUR. Inclui tambem a oferta da camara de ar fornecida com a bicicleta no caso de um furo.

//Nao podemos assegurar contra roubo, perda total da bicicleta, danos graves em caso de acidente ou responsabilidade de terceiros. Por favor, verifique a sua propria apolice de seguro de ferias, pois na maioria dos casos, ela o cobrira no infeliz evento de um acidente grave ou roubo.', 'Seguros', 'Texto Seguro Premium');

    //    $hora_recolha_label = apply_filters('wpml_translate_single_string', 'Hora de Recolha', 'Horas', 'Hora de Recolha');
    //    $hora_entrega_label = apply_filters('wpml_translate_single_string', 'Hora de entrega', 'Horas', 'Hora de entrega');

        // Botones para abrir popups
   //     echo '<div class="popups-seguros" style="margin-bottom:15px;">';

   //     echo '<p><strong><span style="color:#000;">' . $titulo_basico . '//</span></strong> ';
    //    echo '<button type="button" class="popup-btn" data-popup-target="#popup-basico" style="color:red; background:none; border:none; cursor:pointer;">+ info</button></p>';

    //    echo '<p><strong><span style="color:#000;">' . $titulo_premium . '</span></strong> ';
     //   echo '<button type="button" class="popup-btn" data-popup-target="#popup-premium" style="color:red; background:none; border:none; cursor:pointer;">+ info</button></p>';

    //    echo '</div>';

        // Popup seguro básico
   //     echo '
    //    <div id="popup-basico" class="custom-popup">
       //     <div class="popup-content">
         //       <span class="close-popup">&times;</span>
          //      <h2 style="color: #d60000; font-weight: bold;">' . $titulo_basico . '</h2>
          //      <p>' . $intro_basico . '</p>
           //     <table style="width: 100%; border-collapse: collapse; text-align: left;">
           //        <thead>
            //            <tr style="background: #f5f5f5;">
             //               <th style="border: 1px solid #ccc; padding: 8px;"//>Cobertura Base</th>
              //              <th style="border: 1px solid #ccc; padding: 8px;"//>Capital Insured</th>
              //          </tr>
              //      </thead>
              //      <tbody>
              //          <tr>
              //              <td style="border: 1px solid #ccc; padding: 8px;">Morte ou Invalidez Permanente</td>
               //             <td style="border: 1px solid #ccc; padding: 8px;">20.000,00 EUR</td>
              //         <tr>
              //              <td style="border: 1px solid #ccc; padding: 8px;">* Despesas Medicas e Repatriamento</td>
               //             <td style="border: 1px solid #ccc; padding: 8px;">3.500,00 EUR</td>
              //          </tr>
              //          <tr>
               //             <td style="border: 1px solid #ccc; padding: 8px;">** Responsabilidade de Exploracao</td>
               //             <td style="border: 1px solid #ccc; padding: 8px;">50.000,00 EUR</td>
                //        </tr>
                //    </tbody>
               // </table>
              //  <p style="margin-top: 10px; font-size: 0.9em;">' . //$rodape_basico . '</p>
           // </div>
        //</div>';

      //  // Popup seguro premium
       // echo '
       // <div id="popup-premium" class="custom-popup">
        //    <div class="popup-content">
        //        <span class="close-popup">&times;</span>
         //       <h2 style="color: #d60000; font-weight: bold;">' . //$titulo_premium . '</h2>
         //       <p>' . nl2br($texto_premium) . '</p>
         //   </div>
        //</div>';

      //  // Selector de horas con etiquetas traducibles
       // echo '<div class="hora-seleccion" style="margin-top:15px;">';
      //  echo '<label for="hora_recolha">' . $hora_recolha_label . ':</label>';
       // echo '<select name="hora_recolha" required>';
      //  for ($h = strtotime('10:00'); $h <= strtotime('17:00'); $h += 1800) {
       //     $hora = date('H:i', $h);
       //     echo "<option value='$hora'>$hora</option>";
       // }
      //  echo '</select>';

      //  echo '<br><label for="hora_entrega">' . $hora_entrega_label . ':</label>';
       // echo '<select name="hora_entrega" required>';
      //  for ($h = strtotime('10:00'); $h <= strtotime('17:00'); $h += 1800) {
      //      $hora = date('H:i', $h);
      //      echo "<option value='$hora'>$hora</option>";
     //   }
     //   echo '</select>';
     //   echo '</div>';

        
// Guardar los datos en el carrito
add_filter('woocommerce_add_cart_item_data', 'guardar_horas_alugueres', 10, 2);
function guardar_horas_alugueres($cart_item_data, $product_id) {
    if (isset($_POST['hora_recolha'])) {
        $cart_item_data['hora_recolha'] = sanitize_text_field($_POST['hora_recolha']);
    }
    if (isset($_POST['hora_entrega'])) {
        $cart_item_data['hora_entrega'] = sanitize_text_field($_POST['hora_entrega']);
    }
    return $cart_item_data;
}

// Mostrar los datos en el carrito y checkout
add_filter('woocommerce_get_item_data', 'mostrar_horas_alugueres_carrito', 10, 2);
function mostrar_horas_alugueres_carrito($item_data, $cart_item) {
    if (isset($cart_item['hora_recolha'])) {
        $item_data[] = array(
            'name' => __('Hora de recolha', 'woodmart-child'),
            'value' => $cart_item['hora_recolha']
        );
    }
    if (isset($cart_item['hora_entrega'])) {
        $item_data[] = array(
            'name' => __('Hora de entrega', 'woodmart-child'),
            'value' => $cart_item['hora_entrega']
        );
    }
    return $item_data;
}


//datanosemails
add_filter('woocommerce_order_item_name', 'agregar_horas_a_emails', 10, 3);
function agregar_horas_a_emails($item_name, $item, $is_visible) {
    $hora_recolha = $item->get_meta('hora_recolha');
    $hora_entrega = $item->get_meta('hora_entrega');

    if ($hora_recolha || $hora_entrega) {
        $item_name .= '<br><small>';
        if ($hora_recolha) {
            $item_name .= __('Hora de recolha', 'woodmart-childn') . ': ' . esc_html($hora_recolha) . '<br>';
        }
        if ($hora_entrega) {
            $item_name .= __('Hora de entrega', 'woodmart-child') . ': ' . esc_html($hora_entrega);
        }
        $item_name .= '</small>';
    }

    return $item_name;
}

// Guardar en el objeto de pedido
add_action('woocommerce_checkout_create_order_line_item', 'guardar_en_pedido_horas_alugueres', 10, 4);
function guardar_en_pedido_horas_alugueres($item, $cart_item_key, $values, $order) {
    if (!empty($values['hora_recolha'])) {
        $item->add_meta_data('hora_recolha', $values['hora_recolha'], true);
    }
    if (!empty($values['hora_entrega'])) {
        $item->add_meta_data('hora_entrega', $values['hora_entrega'], true);
    }
}

//form
add_action( 'init', function() {
    if ( ! function_exists( 'jet_form_is_form_exists' ) ) return;

    $form_id = 'bike_booking_form';
    if ( jet_form_is_form_exists( $form_id ) ) return;

    jet_form_insert_form( [
        'form_id'   => $form_id,
        'title'     => 'Bike Booking Form',
        'settings'  => [ 'submit_type' => 'ajax' ],
        'fields'    => [
            jet_form_fb()->field->prepare( [ 'type' => 'hidden', 'name' => 'post_id', 'settings' => [ 'field_label' => 'Post ID', 'default' => 'post_id' ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'date',   'name' => 'check_in_date', 'settings' => [ 'field_label' => 'Check-in Date' ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'date',   'name' => 'check_out_date', 'settings' => [ 'field_label' => 'Check-out Date' ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'time',   'name' => 'pickup_time', 'settings' => [ 'field_label' => 'Pickup Time', 'min_time' => '09:00', 'max_time' => '18:00' ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'number', 'name' => 'bike_quantity', 'settings' => [ 'field_label' => 'Bike Quantity' ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'radio',  'name' => 'insurance_type', 'settings' => [ 'field_label' => 'Insurance Type', 'options' => [ ['label'=>'Free','value'=>'0'], ['label'=>'Premium','value'=>'10'] ] ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'calculated', 'name' => 'booking_duration', 'settings' => [ 'field_label' => 'Booking Duration','calculate'=>'days_diff(%check_in_date%, %check_out_date%)' ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'calculated', 'name' => 'insurance_cost_total', 'settings' => [ 'field_label' => 'Insurance Total','calculate'=>'if(%insurance_type%==10, %insurance_type% * %bike_quantity% * %booking_duration%, 0)' ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'calculated', 'name' => 'booking_total', 'settings' => [ 'field_label' => 'Total Cost','calculate'=>'(%daily_price% * %bike_quantity% * %booking_duration%) + %insurance_cost_total%' ] ] ),
            jet_form_fb()->field->prepare( [ 'type' => 'submit', 'name' => 'reserve', 'settings' => [ 'field_label' => 'Reserve Now' ] ] ),
        ],
    ], false );
} );

//atum api
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/inventories/(?P<product_id>\d+)', [
        'methods' => 'GET',
        'callback' => 'get_custom_atum_inventories',
        'permission_callback' => '__return_true',
    ]);
});

function get_custom_atum_inventories($request) {
    $product_id = (int) $request['product_id'];
    $inventories = get_post_meta($product_id, '_mi_inventory_data', true);

    if (!$inventories) {
        return new WP_REST_Response(['error' => 'No inventories found'], 404);
    }

    return new WP_REST_Response($inventories, 200);
}


// Shortcode para integrar Bikesul Rental App
function bikesul_rental_shortcode($atts) {
    // Parámetros del shortcode
    $atts = shortcode_atts(array(
        'language' => 'pt',      // pt o en
        'width' => '100%',       // ancho del iframe
        'height' => '1200px'     // altura del iframe
    ), $atts, 'bikesul_rental');

    // URL de tu aplicación (cambiar por tu dominio)
    $app_url = 'https://app.bikesultoursgest.com'; // O tu URL de Netlify

    // Construir iframe responsive
    $iframe = sprintf(
        '<div style="position: relative; width: %s; padding-bottom: 160%%; height: 0; overflow: hidden;">
            <iframe src="%s/?lang=%s"
                    style="position: absolute; top: 0; left: 0; width: 100%%; height: %s; border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
                    allowfullscreen>
            </iframe>
        </div>',
        esc_attr($atts['width']),
        esc_url($app_url),
        esc_attr($atts['language']),
        esc_attr($atts['height'])
    );

    return $iframe;
}
add_shortcode('bikesul_rental', 'bikesul_rental_shortcode');

// CSS adicional para responsividad
function bikesul_rental_styles() {
    echo '<style>
        .bikesul-rental-container {
            max-width: 100%;
            margin: 0 auto;
        }
        @media (max-width: 768px) {
            .bikesul-rental-container iframe {
                height: 800px !important;
            }
        }
    </style>';
}
add_action('wp_head', 'bikesul_rental_styles');


//datosdepedio
add_action('woocommerce_checkout_update_order_meta', 'agregar_nota_con_metadatos_del_pedido', 10, 1);

function agregar_nota_con_metadatos_del_pedido($order_id) {
    $order = wc_get_order($order_id);

    if (!$order) return;

    $nota = "📋 Datos personalizados del pedido:\n";

    // Metadatos generales
    $meta_keys = [
        '_rental_start_date' => 'Fecha de inicio',
        '_rental_end_date' => 'Fecha de fin',
        '_rental_days' => 'Días de alquiler',
        '_pickup_time' => 'Hora de recogida',
        '_return_time' => 'Hora de devolución',
        '_bike_size' => 'Tamaño bicicleta',
        '_rental_price_per_day' => 'Precio por día',
        '_rental_total_price' => 'Precio total',
    ];

    foreach ($meta_keys as $key => $label) {
        $valor = $order->get_meta($key);
        if ($valor) {
            $nota .= "• {$label}: {$valor}\n";
        }
    }

    // Agregar nota al pedido
    $order->add_order_note($nota, false); // false = nota privada (visible solo al admin)
}

// ===============================================
// 🚨 FUNCIONES DUPLICADAS ELIMINADAS:
// ===============================================
// ❌ ELIMINADA: ajustar_precios_orden_directa() 
//    (duplicada en woocommerce-bikesul-pricing.php como bikesul_ajustar_precios_orden_directa)
//
// ❌ ELIMINADA: calcular_precio_alquiler_personalizado() 
//    (duplicada en woocommerce-bikesul-pricing.php como bikesul_calcular_precio_alquiler_carrito)
//
// ❌ ELIMINADA: agregar_datos_rental_carrito() 
//    (duplicada en woocommerce-bikesul-pricing.php como bikesul_agregar_datos_rental_carrito)
//
// ❌ ELIMINADA: mostrar_info_rental_carrito() 
//    (duplicada en woocommerce-bikesul-pricing.php como bikesul_mostrar_info_rental_carrito)


// ===============================================
// ✅ CARGA DE COMPONENTES BIKESUL - SOLO SAFE LOADER
// ===============================================

// ✅ SAFE LOADER ACTIVO - Gestiona carga automática de todos los componentes
require_once get_stylesheet_directory() . '/bikesul-safe-loader.php';

// ❌ CARGAS MANUALES COMENTADAS - Evita duplicados
// require_once get_stylesheet_directory() . '/woocommerce-bikesul-pricing.php';
// require_once get_stylesheet_directory() . '/woocommerce-insurance-handler.php';
// require_once get_stylesheet_directory() . '/woocommerce-dynamic-order-shortcodes.php';
// require_once get_stylesheet_directory() . '/woocommerce-bikesul-custom-fields-identifier.php';
// require_once get_stylesheet_directory() . '/woocommerce-fluentboard-shortcodes-patch.php';
// require_once get_stylesheet_directory() . '/woocommerce-fluentcrm-bikesul-smartcodes-v3-final.php';

//api
// 1️⃣ Registrar un endpoint REST nuevo
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/stock', array(
        'methods'  => 'GET',
        'callback' => 'get_custom_stock',
        'permission_callback' => '__return_true', // ⚠️ Proteger después
    ));
});

// 2️⃣ Función que busca stock real por producto y variaciones
function get_custom_stock( $data ) {
    $product_id = $data['product_id'];

    if ( ! $product_id ) {
        return new WP_Error('no_product', 'Debes enviar un product_id', array('status' => 400));
    }

    // Obtener producto de WooCommerce
    $product = wc_get_product($product_id);

    if ( ! $product ) {
        return new WP_Error('not_found', 'Producto no encontrado', array('status' => 404));
    }

    $response = [];

    // Si es un producto variable, listamos las variaciones
    if ( $product->is_type('variable') ) {
        $variations = $product->get_children();

        foreach ( $variations as $variation_id ) {
            $variation = wc_get_product($variation_id);

            // 🔍 Aquí buscamos el stock usando ATUM (si Multi-Inventory está activo)
            // Multi-Inventory guarda datos en la tabla wp_atum_product_data o wp_atum_inventories
            global $wpdb;
            $mi_stock = $wpdb->get_results($wpdb->prepare("
                SELECT locations.name as location, inventories.stock_quantity
                FROM {$wpdb->prefix}atum_inventories as inventories
                LEFT JOIN {$wpdb->prefix}atum_inventory_locations as locations
                    ON inventories.inventory_location_id = locations.id
                WHERE inventories.product_id = %d
            ", $variation_id ));

            $response[] = array(
                'variation_id' => $variation_id,
                'name' => $variation->get_name(),
                'sku' => $variation->get_sku(),
                'stock' => $variation->get_stock_quantity(),
                'multi_inventory' => $mi_stock
            );
        }
    } else {
        // Producto simple
        $response[] = array(
            'product_id' => $product_id,
            'name' => $product->get_name(),
            'stock' => $product->get_stock_quantity()
        );
    }

    return $response;
}

?>
