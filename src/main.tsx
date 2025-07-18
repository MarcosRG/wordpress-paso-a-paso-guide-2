import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Inicializar servicios de sincronización local
import "./services/localSyncService";

// Inicializar interceptor de errores para debugging
import { initializeErrorInterceptor } from "./utils/errorInterceptor";

// Solo inicializar en desarrollo
if (import.meta.env.DEV) {
  initializeErrorInterceptor();
}

createRoot(document.getElementById("root")!).render(<App />);
