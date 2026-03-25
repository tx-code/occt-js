import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { createReadStream, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const testDir = resolve(__dirname, "..", "test");

function serveTestFixtures() {
  return {
    name: "serve-test-fixtures",
    configureServer(server) {
      server.middlewares.use("/test", (req, res, next) => {
        const filePath = resolve(testDir, req.url.replace(/^\/+/, "").split("?")[0]);
        if (!filePath.startsWith(testDir)) { next(); return; }
        if (!existsSync(filePath)) { next(); return; }
        res.setHeader("Content-Type", "application/octet-stream");
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveTestFixtures()],
  base: "./",
  server: { port: 5173, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
