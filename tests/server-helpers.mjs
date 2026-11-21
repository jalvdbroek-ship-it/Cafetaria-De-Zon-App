import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../server/app.mjs";

export const NOW = new Date("2026-11-18T16:50:00Z"); // woensdag 17:50 NL: open
export const H = { "Content-Type": "application/json", "X-Dezon": "1" };
export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

export async function boot({ adminPassword = "beheer-wachtwoord-1", now = NOW } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "dezon-"));
  const server = createAppServer({ dataDir: dir, adminPassword, now: () => now, log: () => {} });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const jar = {}; // eenvoudige cookiepot per client
  const call = async (path, { method = "GET", body, headers = {}, cookie = "", raw } = {}) => {
    const res = await fetch(base + path, { method, redirect: "manual", headers: { ...(method === "GET" ? {} : H), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers, cookie: (res.headers.getSetCookie?.()[0] || "").split(";")[0] };
  };
  return { base, server, call, jar, dir, close: async () => { await new Promise((r) => server.close(r)); server.closeAllConnections?.(); rmSync(dir, { recursive: true, force: true }); } };
}
export const customer = { naam: "Jan", telefoon: "0612345678", email: "", opmerking: "" };
export const line = (productId = "frites-middel", qty = 2, selection = {}) => ({ productId, qty, selection });
