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
  registerSW({ immediate: true });
}

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
