/**
 * NETLIFY FUNCTION - MySQL Direct Products API
 * API ultra-rápida que conecta directamente a MySQL de WordPress
 * Objetivo: <500ms response time
 */

const mysql = require('mysql2/promise');
const { createSuccessResponse, createErrorResponse } = require('./_shared/config');

// Configuración MySQL desde variables de entorno
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  tablePrefix: process.env.MYSQL_TABLE_PREFIX || 'wp_',
  
  // Configuraciones de rendimiento
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

// Cache en memoria para conexiones (optimización)
let connectionPool = null;

/**
 * Crear pool de conexiones MySQL optimizado
 */
function createConnectionPool() {
  if (!connectionPool) {
    connectionPool = mysql.createPool({
      ...MYSQL_CONFIG,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 30000,
      timeout: 30000
    });
  }
  return connectionPool;
}

/**
 * Query optimizado para productos con ACF y variaciones
 */
function getProductsQuery(tablePrefix, categorySlug = 'alugueres', limit = 100) {
  return `
    SELECT DISTINCT
      p.ID as id,
      p.post_title as name,
      p.post_name as slug,
      p.post_content as description,
      p.post_excerpt as short_description,
      p.post_status as status,
      p.post_date as created_at,
      
      -- Metadatos del producto
      MAX(CASE WHEN pm.meta_key = '_product_type' THEN pm.meta_value END) as type,
      MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as price,
      MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as regular_price,
      MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as sale_price,
      MAX(CASE WHEN pm.meta_key = '_stock_quantity' THEN pm.meta_value END) as stock_quantity,
      MAX(CASE WHEN pm.meta_key = '_stock_status' THEN pm.meta_value END) as stock_status,
      MAX(CASE WHEN pm.meta_key = '_manage_stock' THEN pm.meta_value END) as manage_stock,
      
      -- ACF Fields para precios BiKeSul
      MAX(CASE WHEN pm.meta_key = 'precio_1_2' THEN pm.meta_value END) as precio_1_2,
      MAX(CASE WHEN pm.meta_key = 'precio_3_6' THEN pm.meta_value END) as precio_3_6,
      MAX(CASE WHEN pm.meta_key = 'precio_7_mais' THEN pm.meta_value END) as precio_7_mais,
      
      -- Imagen destacada URL
      MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN (
        SELECT img.guid FROM ${tablePrefix}posts img WHERE img.ID = pm.meta_value LIMIT 1
      ) END) as featured_image_url

    FROM ${tablePrefix}posts p
    
    -- Join optimizado con metadatos
    LEFT JOIN ${tablePrefix}postmeta pm ON p.ID = pm.post_id
    
    -- Join con categorías de producto  
    INNER JOIN ${tablePrefix}term_relationships tr ON p.ID = tr.object_id
    INNER JOIN ${tablePrefix}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'product_cat'
    INNER JOIN ${tablePrefix}terms t ON tt.term_id = t.term_id
    
    WHERE 
      p.post_type = 'product'
      AND p.post_status = 'publish'
      AND t.slug = ?
      
    GROUP BY p.ID
    ORDER BY p.post_date DESC
    LIMIT ?
  `;
}

/**
 * Query para variaciones de producto
 */
function getVariationsQuery(tablePrefix, productId) {
  return `
    SELECT 
      v.ID as id,
      v.post_title as name,
      v.post_status as status,
      v.menu_order as sort_order,
      
      -- Metadatos de variación
      MAX(CASE WHEN vm.meta_key = '_price' THEN vm.meta_value END) as price,
      MAX(CASE WHEN vm.meta_key = '_regular_price' THEN vm.meta_value END) as regular_price,
      MAX(CASE WHEN vm.meta_key = '_sale_price' THEN vm.meta_value END) as sale_price,
      MAX(CASE WHEN vm.meta_key = '_stock_quantity' THEN vm.meta_value END) as stock_quantity,
      MAX(CASE WHEN vm.meta_key = '_stock_status' THEN vm.meta_value END) as stock_status,
      
      -- Imagen de variación
      MAX(CASE WHEN vm.meta_key = '_thumbnail_id' THEN (
        SELECT img.guid FROM ${tablePrefix}posts img WHERE img.ID = vm.meta_value LIMIT 1
      ) END) as image_url

    FROM ${tablePrefix}posts v
    LEFT JOIN ${tablePrefix}postmeta vm ON v.ID = vm.post_id
    WHERE 
      v.post_parent = ?
      AND v.post_type = 'product_variation'
      AND v.post_status = 'publish'
    GROUP BY v.ID
    ORDER BY v.menu_order ASC
  `;
}

/**
 * Query para atributos de variación
 */
function getVariationAttributesQuery(tablePrefix, variationId) {
  return `
    SELECT 
      REPLACE(meta_key, 'attribute_', '') as attribute_name,
      meta_value as attribute_value
    FROM ${tablePrefix}postmeta 
    WHERE 
      post_id = ?
      AND meta_key LIKE 'attribute_%'
      AND meta_value != ''
  `;
}

/**
 * Procesar y transformar datos de productos
 */
function transformProductData(products, variationsMap = {}, attributesMap = {}) {
  return products.map(product => {
    // ACF pricing
    const acf = {
      precio_1_2: product.precio_1_2 ? parseFloat(product.precio_1_2) : null,
      precio_3_6: product.precio_3_6 ? parseFloat(product.precio_3_6) : null,
      precio_7_mais: product.precio_7_mais ? parseFloat(product.precio_7_mais) : null
    };

    // Variaciones del producto
    const variations = variationsMap[product.id] || [];
    
    // Transformar variaciones con atributos
    const processedVariations = variations.map(variation => {
      const attributes = attributesMap[variation.id] || [];
      const attributesObj = attributes.reduce((acc, attr) => {
        acc[attr.attribute_name] = attr.attribute_value;
        return acc;
      }, {});

      return {
        id: variation.id,
        attributes: attributesObj,
        price: variation.price || '0',
        regular_price: variation.regular_price || '0',
        sale_price: variation.sale_price || '',
        stock_quantity: parseInt(variation.stock_quantity || '0'),
        stock_status: variation.stock_status || 'outofstock',
        image_url: variation.image_url || null
      };
    });

    // Calcular stock total
    let totalStock = 0;
    if (product.type === 'variable' && processedVariations.length > 0) {
      totalStock = processedVariations.reduce((sum, variation) => {
        return sum + (variation.stock_status === 'instock' ? variation.stock_quantity : 0);
      }, 0);
    } else {
      totalStock = product.stock_status === 'instock' ? parseInt(product.stock_quantity || '0') : 0;
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      type: product.type || 'simple',
      status: product.status,
      price: product.price || '0',
      regular_price: product.regular_price || '0',
      sale_price: product.sale_price || '',
      description: product.description || '',
      short_description: product.short_description || '',
      image_url: product.featured_image_url || null,
      stock_quantity: totalStock,
      stock_status: totalStock > 0 ? 'instock' : 'outofstock',
      manage_stock: product.manage_stock === 'yes',
      variations: processedVariations,
      acf,
      categories: [{ id: 319, name: 'ALUGUERES', slug: 'alugueres' }], // Por ahora hardcoded
      created_at: product.created_at
    };
  });
}

/**
 * Función principal del endpoint
 */
exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 MySQL Bikes API started');

    // Validar configuración detalhadamente
    const missingConfig = [];
    if (!MYSQL_CONFIG.host) missingConfig.push('MYSQL_HOST');
    if (!MYSQL_CONFIG.database) missingConfig.push('MYSQL_DATABASE');
    if (!MYSQL_CONFIG.user) missingConfig.push('MYSQL_USERNAME');
    if (!MYSQL_CONFIG.password) missingConfig.push('MYSQL_PASSWORD');

    if (missingConfig.length > 0) {
      console.error('❌ MySQL configuration incomplete:', missingConfig);
      return createErrorResponse({
        message: 'MySQL configuration incomplete',
        missing_variables: missingConfig,
        help: 'Configure estas variáveis no painel do Netlify'
      }, 500);
    }

    console.log(`✅ MySQL Config: ${MYSQL_CONFIG.user}@${MYSQL_CONFIG.host}/${MYSQL_CONFIG.database}`);

    // Parámetros de query
    const params = event.queryStringParameters || {};
    const categorySlug = params.category || 'alugueres';
    const limit = Math.min(parseInt(params.limit || '100'), 200); // Máximo 200
    const includeVariations = params.variations !== 'false';

    console.log(`📊 Fetching products: category=${categorySlug}, limit=${limit}, variations=${includeVariations}`);

    // Crear conexión
    const pool = createConnectionPool();
    
    // Query principal de productos
    const productsQuery = getProductsQuery(MYSQL_CONFIG.tablePrefix, categorySlug, limit);
    const [products] = await pool.execute(productsQuery, [categorySlug, limit]);
    
    console.log(`✅ Found ${products.length} products`);

    let variationsMap = {};
    let attributesMap = {};

    // Obtener variaciones si se solicitan
    if (includeVariations && products.length > 0) {
      const productIds = products.map(p => p.id);
      
      // Obtener todas las variaciones
      const variationsPromises = productIds.map(async (productId) => {
        const variationsQuery = getVariationsQuery(MYSQL_CONFIG.tablePrefix, productId);
        const [variations] = await pool.execute(variationsQuery, [productId]);
        return { productId, variations };
      });

      const variationsResults = await Promise.all(variationsPromises);
      
      // Organizar variaciones por producto
      variationsResults.forEach(({ productId, variations }) => {
        if (variations.length > 0) {
          variationsMap[productId] = variations;
        }
      });

      // Obtener atributos de todas las variaciones
      const allVariations = Object.values(variationsMap).flat();
      if (allVariations.length > 0) {
        const attributesPromises = allVariations.map(async (variation) => {
          const attributesQuery = getVariationAttributesQuery(MYSQL_CONFIG.tablePrefix, variation.id);
          const [attributes] = await pool.execute(attributesQuery, [variation.id]);
          return { variationId: variation.id, attributes };
        });

        const attributesResults = await Promise.all(attributesPromises);
        
        // Organizar atributos por variaci��n
        attributesResults.forEach(({ variationId, attributes }) => {
          if (attributes.length > 0) {
            attributesMap[variationId] = attributes;
          }
        });
      }

      console.log(`✅ Loaded variations for ${Object.keys(variationsMap).length} products`);
    }

    // Transformar datos
    const transformedProducts = transformProductData(products, variationsMap, attributesMap);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`🏁 MySQL Bikes API completed in ${duration}ms`);

    return createSuccessResponse({
      products: transformedProducts,
      total: transformedProducts.length,
      category: categorySlug,
      performance: {
        duration_ms: duration,
        queries_executed: includeVariations ? 1 + Object.keys(variationsMap).length + Object.values(variationsMap).flat().length : 1,
        mysql_connection: 'direct'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ MySQL Bikes API error:', error);
    
    return createErrorResponse({
      message: 'Failed to fetch products from MySQL',
      error: error.message,
      duration_ms: duration,
      mysql_config: {
        host: MYSQL_CONFIG.host,
        database: MYSQL_CONFIG.database,
        user: MYSQL_CONFIG.user,
        connected: false
      }
    }, 500);
  }
};
