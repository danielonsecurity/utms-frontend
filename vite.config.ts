import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  esbuild: {
    format: "esm", // Explicitly set ESM format
    tsconfigRaw: {
      compilerOptions: {
        // Override TypeScript options at build time
        target: "esnext",
        useDefineForClassFields: true,
      },
    },
  },

  optimizeDeps: {
    include: ["gridstack"],
  },
  server: {
    allowedHosts: ["localhost", "thinkpad.smart.home"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ["**/.git/**", "**/node_modules/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
