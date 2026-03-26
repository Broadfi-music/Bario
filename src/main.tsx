import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");

const isPreviewContext = (() => {
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");

  let isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch {
    isInIframe = true;
  }

  return isPreviewHost || isInIframe;
})();

const clearPreviewServiceWorkersAndCaches = async () => {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.allSettled(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }
  } catch (error) {
    console.warn("Preview cache cleanup skipped", error);
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

if (root) {
  if (isPreviewContext) {
    clearPreviewServiceWorkersAndCaches().finally(mountApp);
  } else {
    mountApp();
  }
}
