import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize services asynchronously to avoid blocking the main thread
const initializeServices = async () => {
  // Reset any connectivity issues on startup
  await import("./utils/resetConnectivity");

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

  // Initialize services
  import("./services/reservationService");
  import("./services/adminAuthService");
  import("./services/wordpressSyncService");

  // Performance testing utility for debugging
  const { performanceTest } = await import("./utils/performanceTest");
  (window as any).performanceTest = performanceTest;

  // Import diagnostic for global access
  const { runSystemDiagnostic } = await import('./utils/systemDiagnostic');
  (window as any).runSystemDiagnostic = runSystemDiagnostic;
};

// Initialize services
initializeServices();

// Render the app
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(App));
}
