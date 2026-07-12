import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "侠客行",
        short_name: "侠客行",
        description: "轻量文字武侠 RPG",
        theme_color: "#12100e",
        background_color: "#12100e",
        display: "standalone",
        orientation: "portrait",
      },
    }),
  ],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      "/ws": { target: "ws://127.0.0.1:3001", ws: true },
      "/health": "http://127.0.0.1:3001",
    },
  },
});
