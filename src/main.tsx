import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Show something even if the app crashes before React can render.
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[global error]", e.error ?? e.message);
});

window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[unhandled rejection]", e.reason);
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

try {
  createRoot(rootEl).render(<App />);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[bootstrap] React failed to render", err);
  rootEl.innerHTML = `
    <div style="padding:16px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
      <h1 style="font-size:16px; margin:0 0 8px 0;">App failed to start</h1>
      <pre style="white-space:pre-wrap; margin:0;">${String(err)}</pre>
    </div>
  `;
}

