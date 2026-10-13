import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { retireLegacyAppWorkers } from "./lib/pwa";

void retireLegacyAppWorkers();
const root = document.getElementById("root");
if (!root) throw new Error("App root is missing");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
