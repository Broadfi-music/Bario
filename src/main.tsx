import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

// Ensure root element has styles applied immediately
const rootElement = document.getElementById("root");
if (rootElement) {
  rootElement.style.minHeight = '100vh';
  rootElement.style.backgroundColor = '#000';
}

// Also apply to body
document.body.style.backgroundColor = '#000';
document.body.style.color = '#fff';
document.body.style.margin = '0';
document.body.style.padding = '0';

createRoot(rootElement!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);