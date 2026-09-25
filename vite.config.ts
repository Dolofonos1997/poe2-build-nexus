import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: "v2",
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../dist/v2", emptyOutDir: true },
});
