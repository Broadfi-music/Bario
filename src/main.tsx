import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
// Force rebuild: 2026-03-28-preview-hotfix-v5
const PREVIEW_BUILD_TAG = "2026-03-28-preview-hotfix-v5";
const PREVIEW_CACHE_RESET_KEY = `bario-preview-cache-reset-${PREVIEW_BUILD_TAG}`;

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

const ensureFreshPreviewBuild = async (): Promise<boolean> => {
  await clearPreviewServiceWorkersAndCaches();

  const url = new URL(window.location.href);
  const hasBuildTag = url.searchParams.get("_preview_build") === PREVIEW_BUILD_TAG;
  const hasReset = sessionStorage.getItem(PREVIEW_CACHE_RESET_KEY) === "1";
  if (hasReset && hasBuildTag) return true;

  sessionStorage.setItem(PREVIEW_CACHE_RESET_KEY, "1");
  url.searchParams.set("_preview_build", PREVIEW_BUILD_TAG);
  url.searchParams.set("_preview_refresh", Date.now().toString());
  window.location.replace(url.toString());
  return false;
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
    ensureFreshPreviewBuild().then((canMount) => {
      if (canMount) mountApp();
    });
  } else {
    registerSW({ immediate: true });
    mountApp();
  }
}
