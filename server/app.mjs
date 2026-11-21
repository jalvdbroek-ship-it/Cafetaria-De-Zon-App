// De hele De Zon-server: statische app, /uploads en /api. Alleen Node, geen pakketten. Start via server.js.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.mjs";
import { createContext } from "./context.mjs";
import { createApi } from "./api.mjs";
import { seed, siteBase } from "./data.mjs";
import { uploadPath, MIME } from "./upload.mjs";
import { send } from "./http.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const HIDDEN = new Set(["tests", "tools", "docs", "node_modules", "package.json", "package-lock.json", "server.js", "server", "data"]);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png",
  ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
};
const CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const SAFE = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY" };

export function createAppServer(opts = {}) {
  const dataDir = opts.dataDir || process.env.DEZON_DATA_DIR || join(root, "data");
  const store = createStore(dataDir);
  seed(store);
  const ctx = createContext({
    store, uploadDir: join(dataDir, "uploads"), adminPassword: opts.adminPassword ?? process.env.DEZON_ADMIN_PASSWORD ?? "", now: opts.now,
    trustProxy: opts.trustProxy ?? process.env.DEZON_TRUST_PROXY === "1", forceSecure: opts.forceSecure ?? process.env.DEZON_SECURE === "1", siteBase,
  });
  const api = createApi(ctx, { log: opts.log });
  const demoOnly = opts.demoOnly ?? process.env.DEZON_DEMO === "1";

  async function serveFile(req, res, file, headers) {
    const body = await readFile(file);
    res.writeHead(200, { ...SAFE, ...headers, "Content-Length": body.length });
    res.end(req.method === "HEAD" ? undefined : body);
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      let path;
      try { path = decodeURIComponent(url.pathname); } catch { return void send(res, 400, "Ongeldig adres", { "Content-Type": "text/plain; charset=utf-8" }); }
      if (path.startsWith("/api/") || path === "/api") {
        // Demo-stand (zoals GitHub Pages): alleen statische bestanden, geen API; de app valt dan terug op de demo.
        if (demoOnly && path === "/api/health") return void send(res, 200, { ok: true, mode: "demo" }, { ...SAFE, "Cache-Control": "no-store" });
        if (demoOnly) return void send(res, 404, "Niet gevonden", { ...SAFE, "Content-Type": "text/plain; charset=utf-8" });
        return void (await api(req, res, url));
      }
      if (req.method !== "GET" && req.method !== "HEAD") return void send(res, 405, "Niet toegestaan", { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      if (path.startsWith("/uploads/")) {
        const file = uploadPath(ctx.uploadDir, path.slice(9));
        if (!file) throw new Error("niet gevonden");
        return void (await serveFile(req, res, file, { "Content-Type": MIME[extname(file).slice(1)], "Cache-Control": "public, max-age=31536000, immutable", "Content-Security-Policy": "default-src 'none'; sandbox" }));
      }
      if (path.includes("\0") || path.includes("\\")) throw new Error("verboden");
      const first = path.split("/").filter(Boolean)[0];
      if (path.split("/").includes("..") || (first && (HIDDEN.has(first) || first.startsWith(".")))) throw new Error("verboden");
      let file = resolve(root, "." + path);
      if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) throw new Error("verboden");
      if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
      const ext = extname(file);
      const h = { "Content-Type": TYPES[ext] || "application/octet-stream" };
      if (ext === ".html") h["Content-Security-Policy"] = CSP;
      if (file.endsWith("sw.js") || ext === ".html") h["Cache-Control"] = "no-cache";
      await serveFile(req, res, file, h);
    } catch {
      if (!res.headersSent) send(res, 404, "Niet gevonden", { ...SAFE, "Content-Type": "text/plain; charset=utf-8" });
    }
  });
  return Object.assign(server, { ctx, store });
}
