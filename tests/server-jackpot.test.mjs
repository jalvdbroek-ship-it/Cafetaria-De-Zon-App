import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { boot, customer, line } from "./server-helpers.mjs";

let s, adm;
before(async () => { s = await boot(); adm = (await s.call("/api/admin/login", { method: "POST", body: { wachtwoord: "beheer-wachtwoord-1" } })).cookie; });
after(async () => { await s.close(); });
const place = (qty) => s.call("/api/orders", { method: "POST", body: { lines: [line("frites-groot", qty)], customer, pickup: { asap: true } } });
const spin = (id, token) => s.call(`/api/orders/${id}/spin`, { method: "POST", headers: { "X-Order-Token": token }, body: {} });

test("standaard staat de Jackpot uit op de server", async () => {
  const o = await place(5);
  assert.equal(o.json.order.jackpotMogelijk, false);
  assert.equal((await spin(o.json.order.id, o.json.token)).status, 409);
});
test("aan: een draai levert een bon op; opnieuw draaien geeft dezelfde uitslag en geen tweede bon", async () => {
  await s.call("/api/admin/config", { method: "PUT", cookie: adm, body: { jackpot: { enabled: true, minTotal: 1000 } } });
  const o = await place(5); // 2000 cent
  assert.equal(o.json.order.jackpotMogelijk, true);
  const a = await spin(o.json.order.id, o.json.token);
  assert.equal(a.status, 200);
  assert.equal(a.json.isNew, true);
  assert.match(a.json.spin.code, /^JKP-/);
  const b = await spin(o.json.order.id, o.json.token);
  assert.equal(b.json.isNew, false);
  assert.equal(b.json.spin.code, a.json.spin.code);
  const vs = (await s.call("/api/admin/vouchers", { cookie: adm })).json.filter((v) => v.orderId === o.json.order.id);
  assert.equal(vs.length, 1);
  const g = await s.call(`/api/orders/${o.json.order.id}`, { headers: { "X-Order-Token": o.json.token } });
  assert.equal(g.json.order.spin.code, a.json.spin.code);
});
test("tegelijk draaien met dezelfde bestelling geeft precies één bon", async () => {
  const o = await place(5);
  const rs = await Promise.all(Array.from({ length: 8 }, () => spin(o.json.order.id, o.json.token)));
  assert.equal(new Set(rs.map((r) => r.json.spin.code)).size, 1);
  assert.equal(rs.filter((r) => r.json.isNew).length, 1);
  assert.equal((await s.call("/api/admin/vouchers", { cookie: adm })).json.filter((v) => v.orderId === o.json.order.id).length, 1);
});
test("draaien kan niet zonder het sleuteltje, met een ander sleuteltje, of onder het minimumbedrag", async () => {
  const o = await place(5), low = await place(1);
  assert.equal((await spin(o.json.order.id, "")).status, 404);
  assert.equal((await spin(o.json.order.id, low.json.token)).status, 404);
  assert.equal(low.json.order.jackpotMogelijk, false);
  assert.equal((await spin(low.json.order.id, low.json.token)).status, 409);
});
test("geannuleerde bestelling mag niet draaien; bon kan één keer verzilverd worden", async () => {
  const o = await place(5), p = await place(5);
  await s.call(`/api/admin/orders/${o.json.order.id}`, { method: "PUT", cookie: adm, body: { status: "geannuleerd" } });
  assert.equal((await spin(o.json.order.id, o.json.token)).status, 409);
  const code = (await spin(p.json.order.id, p.json.token)).json.spin.code;
  const use = () => s.call(`/api/admin/vouchers/${code}`, { method: "PUT", cookie: adm, body: { status: "verzilverd" } });
  assert.equal((await use()).status, 200);
  assert.equal((await use()).status, 409);
  assert.equal((await s.call(`/api/admin/vouchers/${code}`, { method: "PUT", body: { status: "verzilverd" } })).status, 401);
});
test("openbare config toont kansen in procenten en geen gewichten", async () => {
  const j = (await s.call("/api/config")).json.config.jackpot;
  assert.equal(j.enabled, true);
  assert.equal(Math.round(j.prizes.reduce((x, p) => x + p.percent, 0)), 100);
  assert.equal(JSON.stringify(j).includes("weight"), false);
});
