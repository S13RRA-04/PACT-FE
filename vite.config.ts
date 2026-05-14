import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    environmentOptions: {
      jsdom: {
        url: "http://localhost/"
      }
    },
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
