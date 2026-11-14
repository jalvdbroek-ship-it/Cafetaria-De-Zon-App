// Lokale server voor de De Zon-app: PORT=4200 node server.js  ->  http://localhost:4200/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4200);
const hidden = ["tests", "tools", "docs", "node_modules", ".git", ".gg", "package.json", "package-lock.json", "server.js"];
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png",
  ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    const first = path.split(sep).filter(Boolean)[0];
    if (path.includes("..") || (first && (hidden.includes(first) || first.startsWith(".")))) throw new Error("verboden");
    let file = join(root, path);
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    const headers = { "Content-Type": types[extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
    if (file.endsWith("sw.js")) headers["Cache-Control"] = "no-cache";
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Niet gevonden");
  }
}).listen(port, () => console.log(`http://localhost:${port}/`));
