import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const sw = readFileSync(join(root, "sw.js"), "utf8");
const core = [...sw.slice(sw.indexOf("const CORE"), sw.indexOf("];")).matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

test("elk bestand in de offline-lijst bestaat", () => {
  for (const f of core) if (f !== "./") assert.ok(existsSync(join(root, f)), `${f} ontbreekt`);
});
test("alle app-code, data en stijlen staan in de offline-lijst", () => {
  const files = [...walk(join(root, "src")), ...walk(join(root, "config")), ...walk(join(root, "public/css"))]
    .map((p) => relative(root, p).replaceAll("\\", "/"));
  const missing = files.filter((f) => !core.includes(f));
  assert.deepEqual(missing, []);
});
