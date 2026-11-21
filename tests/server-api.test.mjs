import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { boot, customer, line } from "./server-helpers.mjs";

let s;
before(async () => { s = await boot(); });
after(async () => { await s.close(); });
const order = (over = {}) => s.call("/api/orders", { method: "POST", body: { lines: [line()], customer, pickup: { asap: true }, ...over } });

test("health en menu zijn openbaar", async () => {
  const h = await s.call("/api/health");
  assert.equal(h.status, 200);
  assert.equal(h.json.mode, "live");
  const m = await s.call("/api/menu");
  assert.ok(m.json.producten.length > 20);
  assert.equal(m.headers.get("cache-control"), "no-store");
});
test("config toont geen interne gewichten en geen pincode", async () => {
  const c = await s.call("/api/config");
  assert.equal(c.json.config.demo, false);
  assert.equal(JSON.stringify(c.json).includes("weight"), false);
  assert.equal(JSON.stringify(c.json).includes("demoPin"), false);
  assert.equal(c.json.config.jackpot.enabled, false);
});
test("bestelling: de server rekent zelf, bedragen van de client tellen niet", async () => {
  const r = await order({ lines: [{ ...line("frites-middel", 2), unit: 1, total: 1, prijs: 1 }], total: 1 });
  assert.equal(r.status, 201);
  assert.equal(r.json.order.total, 680);
  assert.equal(r.json.order.status, "ontvangen");
  assert.match(r.json.order.id, /^ZON-[A-Z2-9]{5}$/);
  assert.equal(r.json.order.betaling.status, "nog te betalen");
  assert.ok(r.json.token.length > 20);
  assert.equal(JSON.stringify(r.json).includes("tokenHash"), false);
});
test("bestelling: opties tellen mee, ongeldige opties en onbekende producten worden geweigerd", async () => {
  const ok = await order({ lines: [line("frites-middel", 1, { saus: ["mayonaise"] })] });
  assert.equal(ok.json.order.total, 340 + 60);
  assert.equal((await order({ lines: [line("softijs", 1, {})] })).status, 409);
  assert.equal((await order({ lines: [line("bestaat-niet", 1)] })).status, 409);
  assert.equal((await order({ lines: [line("frites-middel", 1, { saus: ["nep"] })] })).status, 409);
});
test("bestelling: validatie van aantallen, klantgegevens en lege mandjes", async () => {
  assert.equal((await order({ lines: [line("frites-middel", 0)] })).status, 422);
  assert.equal((await order({ lines: [line("frites-middel", 1.5)] })).status, 422);
  assert.equal((await order({ lines: [line("frites-middel", 99)] })).status, 422);
  assert.equal((await order({ lines: [] })).status, 422);
  const t = await order({ customer: { ...customer, telefoon: "12" } });
  assert.equal(t.status, 422);
  assert.ok(t.json.fields.telefoon);
  assert.equal((await order({ customer: { naam: 5, telefoon: "0612345678" } })).status, 422);
});
test("bestelling: gesloten moment, groot bedrag en verkeerde Content-Type", async () => {
  assert.equal((await order({ pickup: { asap: false, at: "2020-01-01T10:00:00Z" } })).status, 422);
  assert.equal((await order({ pickup: { asap: false, at: "2026-11-18T23:50:00Z" } })).status, 422); // 00:50 NL, dicht
  assert.equal((await order({ pickup: { asap: false, at: "2026-11-18T17:30:00Z" } })).status, 201);
  assert.equal((await order({ lines: [line("dubbele-hamburger", 20), line("bitterballen", 20), line("kipnuggets", 20)] })).status, 422);
  const r = await s.call("/api/orders", { method: "POST", raw: "{}", headers: { "Content-Type": "text/plain" } });
  assert.equal(r.status, 415);
});
test("wijzigende verzoeken zonder X-Dezon of met vreemde Origin worden geweigerd", async () => {
  const body = JSON.stringify({ lines: [line()], customer, pickup: { asap: true } });
  const a = await s.call("/api/orders", { method: "POST", raw: body, headers: { "Content-Type": "application/json", "X-Dezon": "" } });
  assert.equal(a.status, 403);
  const b = await s.call("/api/orders", { method: "POST", raw: body, headers: { Origin: "https://kwaad.example" } });
  assert.equal(b.status, 403);
  const c = await s.call("/api/orders", { method: "POST", raw: body, headers: { Origin: s.base } });
  assert.equal(c.status, 201);
});
test("bestelling opvragen kan alleen met het bestelsleuteltje", async () => {
  const r = await order();
  const id = r.json.order.id;
  assert.equal((await s.call(`/api/orders/${id}`)).status, 404);
  assert.equal((await s.call(`/api/orders/${id}`, { headers: { "X-Order-Token": "fout" } })).status, 404);
  const g = await s.call(`/api/orders/${id}`, { headers: { "X-Order-Token": r.json.token } });
  assert.equal(g.status, 200);
  assert.equal(g.json.order.id, id);
});
test("onbekende API-paden en methodes", async () => {
  assert.equal((await s.call("/api/nope")).status, 404);
  assert.equal((await s.call("/api/menu", { method: "POST", body: {} })).status, 405);
});
