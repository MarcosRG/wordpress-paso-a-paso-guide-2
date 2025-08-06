/**
 * ENDPOINT DE TEST MYSQL
 * Verifica que la conexión a MySQL funciona correctamente
 */

const mysql = require('mysql2/promise');
const { createSuccessResponse, createErrorResponse } = require('./_shared/config');

// Configuración MySQL
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  tablePrefix: process.env.MYSQL_TABLE_PREFIX || 'wp_',
  acquireTimeout: 60000,
  timeout: 60000,
  charset: 'utf8mb4'
};

exports.handler = async (event, context) => {
  console.log('🧪 MySQL Connection Test started');
  
  try {
    // Validar configuración
    const configErrors = [];
    if (!MYSQL_CONFIG.host) configErrors.push('MYSQL_HOST');
    if (!MYSQL_CONFIG.database) configErrors.push('MYSQL_DATABASE');
    if (!MYSQL_CONFIG.user) configErrors.push('MYSQL_USERNAME');
    if (!MYSQL_CONFIG.password) configErrors.push('MYSQL_PASSWORD');
    
    if (configErrors.length > 0) {
      return createErrorResponse({
        message: 'MySQL configuration incomplete',
        missing_vars: configErrors,
        config: {
          host: MYSQL_CONFIG.host,
          database: MYSQL_CONFIG.database,
          user: MYSQL_CONFIG.user,
          port: MYSQL_CONFIG.port,
          tablePrefix: MYSQL_CONFIG.tablePrefix
        }
      }, 500);
    }

    console.log(`🔗 Connecting to MySQL: ${MYSQL_CONFIG.user}@${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`);
    
    // Crear conexión de test
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    console.log('✅ MySQL connection established');
    
    // Test 1: Verificar conexión básica
    const [pingResult] = await connection.execute('SELECT 1 as ping');
    console.log('✅ MySQL ping successful');

    // Test 2: Verificar tablas de WordPress existen
    const tablesQuery = `SHOW TABLES LIKE '${MYSQL_CONFIG.tablePrefix}%'`;
    const [tables] = await connection.execute(tablesQuery);
    console.log(`✅ Found ${tables.length} WordPress tables`);

    // Test 3: Contar productos en WooCommerce
    const productsCountQuery = `
      SELECT COUNT(*) as total_products 
      FROM ${MYSQL_CONFIG.tablePrefix}posts 
      WHERE post_type = 'product' AND post_status = 'publish'
    `;
    const [productsCount] = await connection.execute(productsCountQuery);
    console.log(`✅ Found ${productsCount[0].total_products} published products`);

    // Test 4: Verificar categoría ALUGUERES
    const categoryQuery = `
      SELECT t.term_id, t.name, t.slug, tt.count
      FROM ${MYSQL_CONFIG.tablePrefix}terms t
      INNER JOIN ${MYSQL_CONFIG.tablePrefix}term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'product_cat' AND t.slug = 'alugueres'
      LIMIT 1
    `;
    const [category] = await connection.execute(categoryQuery);
    const alugueresCategory = category[0] || null;
    console.log(`✅ ALUGUERES category:`, alugueresCategory);

    // Test 5: Productos en categoría ALUGUERES
    let alugueresProducts = 0;
    if (alugueresCategory) {
      const alugueresQuery = `
        SELECT COUNT(DISTINCT p.ID) as alugueres_count
        FROM ${MYSQL_CONFIG.tablePrefix}posts p
        INNER JOIN ${MYSQL_CONFIG.tablePrefix}term_relationships tr ON p.ID = tr.object_id
        INNER JOIN ${MYSQL_CONFIG.tablePrefix}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        WHERE p.post_type = 'product' 
          AND p.post_status = 'publish'
          AND tt.term_id = ?
      `;
      const [alugueresResult] = await connection.execute(alugueresQuery, [alugueresCategory.term_id]);
      alugueresProducts = alugueresResult[0].alugueres_count;
      console.log(`✅ Found ${alugueresProducts} products in ALUGUERES category`);
    }

    // Test 6: Verificar ACF fields
    const acfQuery = `
      SELECT COUNT(*) as acf_count
      FROM ${MYSQL_CONFIG.tablePrefix}postmeta 
      WHERE meta_key IN ('precio_1_2', 'precio_3_6', 'precio_7_mais')
    `;
    const [acfResult] = await connection.execute(acfQuery);
    const acfFieldsCount = acfResult[0].acf_count;
    console.log(`✅ Found ${acfFieldsCount} ACF pricing fields`);

    // Cerrar conexión
    await connection.end();
    console.log('✅ MySQL connection closed');

    // Respuesta exitosa
    return createSuccessResponse({
      status: 'success',
      message: 'MySQL connection test passed',
      connection: {
        host: MYSQL_CONFIG.host,
        database: MYSQL_CONFIG.database,
        user: MYSQL_CONFIG.user,
        port: MYSQL_CONFIG.port,
        connected: true
      },
      tests: {
        ping: true,
        wordpress_tables: tables.length,
        total_products: productsCount[0].total_products,
        alugueres_category: alugueresCategory,
        alugueres_products: alugueresProducts,
        acf_fields: acfFieldsCount
      },
      wordpress_info: {
        table_prefix: MYSQL_CONFIG.tablePrefix,
        total_tables: tables.length,
        sample_tables: tables.slice(0, 5).map(t => Object.values(t)[0])
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ MySQL test error:', error);
    
    return createErrorResponse({
      message: 'MySQL connection test failed',
      error: error.message,
      error_code: error.code,
      error_errno: error.errno,
      sql_state: error.sqlState,
      config: {
        host: MYSQL_CONFIG.host,
        database: MYSQL_CONFIG.database,
        user: MYSQL_CONFIG.user,
        port: MYSQL_CONFIG.port,
        tablePrefix: MYSQL_CONFIG.tablePrefix
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
};
