import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    // Route TanStack Start's bundled server entry to our SSR error wrapper.
    tanstackStart({ server: { entry: "server" } }),
    react(),
  ],
});
