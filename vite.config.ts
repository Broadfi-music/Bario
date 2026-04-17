import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const FALLBACK_SUPABASE_URL = "https://sufbohhsxlrefkoubmed.supabase.co";
const FALLBACK_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZmJvaGhzeGxyZWZrb3VibWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODY3NjAsImV4cCI6MjA4MDQ2Mjc2MH0.1Ms3xhguJjQ-bbPronddzgO-XCYcTZTkcWS-uUMg1q4";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
    ),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY
    ),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Register the service worker manually in src/main.tsx so we can
      // gate it on production / non-preview contexts. Without registration
      // installed PWAs may fall back to the browser shell instead of
      // launching as standalone.
      injectRegister: null,
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["bario-logo.png", "favicon.ico"],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
        importScripts: ["/sw-push.js"],
      },
      manifest: {
        id: "/?source=pwa",
        name: "Bario - Music Discovery",
        short_name: "Bario",
        description: "Discover trending music, AI remixes & live podcast battles",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        scope: "/",
        start_url: "/?source=pwa",
        launch_handler: {
          client_mode: ["focus-existing", "auto"],
        },
        categories: ["music", "social", "entertainment"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
