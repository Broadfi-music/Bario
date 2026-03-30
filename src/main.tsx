import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
const CACHE_PURGE_KEY = "bario-cache-purge-v6";

const isPreviewContext = (() => {
  try {
    return (
      window.self !== window.top ||
      window.location.hostname.includes("lovableproject.com") ||
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("preview--")
    );
  } catch {
    return true;
  }
})();

const clearClientCaches = async () => {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }
};

const mountApp = () => {
  if (!root) return;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

const boot = async () => {
  const shouldPurge = (() => {
    try {
      return localStorage.getItem(CACHE_PURGE_KEY) !== "1";
    } catch {
      return true;
    }
  })();

  if (isPreviewContext || shouldPurge) {
    await clearClientCaches();
  }

  if (shouldPurge) {
    try {
      localStorage.setItem(CACHE_PURGE_KEY, "1");
      window.location.reload();
      return;
    } catch {
      // If storage is blocked, continue without reload to avoid loops.
    }
  }

  mountApp();
};

void boot();
