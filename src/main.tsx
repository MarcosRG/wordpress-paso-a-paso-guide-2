import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Fetch interceptor disabled - now using cleanFetch approach
// import "./utils/fetchInterceptor";

// Reset any connectivity issues on startup
import "./utils/resetConnectivity";

// Test cleanFetch functionality in development
if (import.meta.env.DEV) {
  import("./utils/testCleanFetch");
}

// Initialize MCP client
import("./utils/mcpClient").then(({ initializeMCP }) => {
  initializeMCP();
});

// Initialize connectivity debugger in development
if (import.meta.env.DEV) {
  import("./utils/connectivityDebugger");
}

// LocalSyncService removed - now using direct Neon Database queries

// Inicializar nuevos servicios de reservas y administración
import "./services/reservationService";
import "./services/adminAuthService";
import "./services/wordpressSyncService";

// Inicializar interceptor de errores para debugging
// import { initializeErrorInterceptor } from "./utils/errorInterceptor";

// TEMPORALMENTE DESHABILITADO - Causa recursión con fetchWithRetry
// Solo inicializar en desarrollo
// if (import.meta.env.DEV) {
//   initializeErrorInterceptor();
// }

// Performance testing utility for debugging
import { performanceTest } from "./utils/performanceTest";
(window as any).performanceTest = performanceTest;

// Import diagnostic for global access
import { runSystemDiagnostic } from './utils/systemDiagnostic';
(window as any).runSystemDiagnostic = runSystemDiagnostic;

createRoot(document.getElementById("root")!).render(<App />);
