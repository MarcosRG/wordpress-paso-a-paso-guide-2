import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Inicializar servicios de sincronización local
import "./services/localSyncService";

createRoot(document.getElementById("root")!).render(<App />);
