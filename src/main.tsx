import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Inicializar servicios de Neon
import "./services/syncService";

createRoot(document.getElementById("root")!).render(<App />);
