import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize fetch interceptor early to handle third-party script conflicts
import "./utils/fetchInterceptor";

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

createRoot(document.getElementById("root")!).render(<App />);
