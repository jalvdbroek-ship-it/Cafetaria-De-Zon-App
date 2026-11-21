import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { boot, PNG } from "./server-helpers.mjs";
import { HttpSource, probeServer } from "../src/lib/http-source.mjs";
import { memoryStorage } from "./fixtures.mjs";

let s;
before(async () => { s = await boot(); });
after(async () => { await s.close(); });

// Een browser bewaart cookies zelf; hier doen we dat na.
function client() {
  const jar = new Map();
  const fetchImpl = async (url, init = {}) => {
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(url, { ...init, headers: { ...init.headers, ...(cookie ? { Cookie: cookie } : {}) } });
    for (const c of res.headers.getSetCookie()) { const [kv, ...attrs] = c.split(";"); const [k, v] = kv.split("="); if (attrs.some((a) => /Max-Age=0/.test(a))) jar.delete(k); else jar.set(k, v); }
    return res;
  };
  return new HttpSource({ base: s.base + "/", storage: memoryStorage(), session: memoryStorage(), fetchImpl, now: () => new Date("2026-11-18T16:50:00Z") });
}
const cust = { naam: "Jan", telefoon: "0612345678", email: "", opmerking: "" };
const lines = [{ productId: "frites-middel", selection: {}, qty: 2 }];

test("probeServer herkent de echte server en geeft null als er geen is", async () => {
  assert.equal((await probeServer(fetch, s.base + "/")).mode, "live");
  assert.equal(await probeServer(async () => { throw new Error("weg"); }, s.base + "/"), null);
  assert.equal(await probeServer(async () => ({ ok: true, json: async () => ({ ok: true }) }), s.base + "/"), null);
});
test("gast: bestelling plaatsen, terugvinden met het bewaarde sleuteltje, ValidationError bij fouten", async () => {
  const ds = client();
  assert.equal(ds.mode, "live");
  const o = await ds.placeOrder({ lines, customer: cust, pickup: { asap: true } });
  assert.equal(o.total, 680);
  const list = await ds.listOrders();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, o.id);
  await assert.rejects(ds.placeOrder({ lines, customer: { ...cust, telefoon: "1" }, pickup: { asap: true } }), (e) => e.name === "ValidationError" && Boolean(e.fields.telefoon));
  const menu = await ds.getMenu();
  assert.ok(menu.producten.length > 20);
  assert.equal((await ds.getConfig()).demo, false);
  assert.ok((await ds.getSite()).hours);
});
test("klant: registreren, profiel, bestelling hoort bij het account, uitloggen", async () => {
  const ds = client();
  await ds.register({ naam: "Anna", telefoon: "0688889999", email: "", wachtwoord: "wachtwoord1", akkoord: true });
  assert.equal((await ds.getAccount()).loggedIn, true);
  await ds.placeOrder({ lines, customer: { ...cust, naam: "Anna" }, pickup: { asap: true } });
  assert.equal((await ds.listOrders()).length, 1);
  assert.deepEqual(await ds.toggleFavorite("kroket"), ["kroket"]);
  assert.deepEqual(await ds.toggleFavorite("kroket"), []);
  await ds.logout();
  assert.equal((await ds.getAccount()).loggedIn, false);
  await assert.rejects(ds.redeem("saus"), /Log in/);
  await ds.login({ id: "0688889999", wachtwoord: "wachtwoord1" });
  assert.equal((await ds.getLoyalty()).balance, 0);
  await assert.rejects(ds.login({ id: "0688889999", wachtwoord: "fout" }), /klopt niet/);
});
test("beheer en Jackpot via de bron: inloggen, aanzetten, draaien, foto uploaden", async () => {
  const ds = client();
  assert.equal(await ds.isAdmin(), false);
  assert.equal(await ds.adminLogin("fout"), false);
  assert.equal(await ds.adminLogin("beheer-wachtwoord-1"), true);
  assert.equal(await ds.isAdmin(), true);
  await ds.saveConfig({ jackpot: { enabled: true, minTotal: 1000 } });
  assert.equal((await ds.jackpotInfo()).enabled, true);
  const o = await ds.placeOrder({ lines: [{ productId: "frites-groot", selection: {}, qty: 5 }], customer: cust, pickup: { asap: true } });
  assert.equal(o.jackpotMogelijk, true);
  const a = await ds.spin(o.id), b = await ds.spin(o.id);
  assert.equal(a.isNew, true); assert.equal(b.isNew, false); assert.equal(a.spin.code, b.spin.code);
  assert.equal((await ds.getLoyalty()).vouchers[0].code, a.spin.code);
  assert.equal((await ds.adminVouchers()).some((v) => v.code === a.spin.code), true);
  const url = await ds.uploadPhoto(new Blob([PNG], { type: "image/png" }));
  assert.match(url, /^uploads\/[a-f0-9]{32}\.png$/);
  await assert.rejects(ds.uploadPhoto(new Blob(["x"], { type: "image/svg+xml" })), /Kies een webp/);
  await ds.adminSetStatus(o.id, "klaar");
  assert.equal((await ds.adminStats()).open >= 1, true);
  await ds.adminLogout();
  assert.equal(await ds.isAdmin(), false);
});
