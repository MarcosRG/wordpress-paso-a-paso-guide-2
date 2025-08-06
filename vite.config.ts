import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react()];

  // Solo importar si estamos en desarrollo
  if (mode === 'development') {
    const { componentTagger } = await import('lovable-tagger');
    plugins.push(componentTagger());
  }

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api/wc': {
          target: 'https://bikesultoursgest.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/wc/, '/wp-json/wc'),
          secure: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('📡 Proxy request:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('📨 Proxy response:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
