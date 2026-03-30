import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");

const isPreviewContext = (() => {
  try {
    return (
      window.self !== window.top ||
      window.location.hostname.includes("lovableproject.com") ||
      window.location.hostname.includes("id-preview--")
    );
  } catch {
    return true;
  }
})();

if (isPreviewContext) {
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
} else {
  // One-time cache reset for published domains to clear stale SW shells
  const CACHE_RESET_KEY = "bario-cache-v5";
  if (!localStorage.getItem(CACHE_RESET_KEY)) {
    localStorage.setItem(CACHE_RESET_KEY, "1");
    // Unregister all service workers
    navigator.serviceWorker?.getRegistrations().then((regs) =>
      regs.forEach((r) => r.unregister())
    );
    // Clear all caches
    if ("caches" in window) {
      caches.keys().then((names) =>
        names.forEach((name) => caches.delete(name))
      );
    }
    // Force hard reload after clearing
    setTimeout(() => window.location.reload(), 300);
  } else {
    registerSW({ immediate: true });
  }
}

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
