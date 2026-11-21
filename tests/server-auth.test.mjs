import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { boot, line, customer } from "./server-helpers.mjs";

let s;
before(async () => { s = await boot(); });
after(async () => { await s.close(); });
const reg = (over = {}) => s.call("/api/auth/register", { method: "POST", body: { naam: "Piet", telefoon: "06 11112222", email: "Piet@Example.nl", wachtwoord: "wachtwoord1", akkoord: true, ...over } });
let cookie;

test("registreren: cookie is httpOnly en SameSite=Lax, wachtwoord komt nergens terug", async () => {
  const r = await reg();
  assert.equal(r.status, 200);
  assert.equal(r.json.telefoon, "0611112222");
  assert.equal(r.json.email, "piet@example.nl");
  const raw = r.headers.getSetCookie()[0];
  assert.match(raw, /HttpOnly/); assert.match(raw, /SameSite=Lax/); assert.match(raw, /Path=\//);
  assert.equal(raw.includes("Secure"), false); // http op localhost
  assert.equal(JSON.stringify(r.json).match(/hash|wachtwoord/), null);
  cookie = r.cookie;
  const me = await s.call("/api/me", { cookie });
  assert.equal(me.json.naam, "Piet");
  const file = JSON.parse(await (await import("node:fs/promises")).readFile(`${s.dir}/customers.json`, "utf8"));
  assert.match(file[0].hash, /^scrypt\$/);
  assert.equal(JSON.stringify(file).includes("wachtwoord1"), false);
});
test("registreren: verplicht akkoord, sterk genoeg wachtwoord, geen dubbele accounts", async () => {
  assert.equal((await reg({ akkoord: false, telefoon: "0622223333" })).status, 422);
  assert.equal((await reg({ wachtwoord: "kort", telefoon: "0622223333" })).status, 422);
  assert.equal((await reg({ telefoon: "0633334444", email: "piet@example.nl" })).status, 409);
  assert.equal((await reg({ telefoon: "0611112222", email: "" })).status, 409);
});
test("zonder inlog geen profiel, bestellingen of punten", async () => {
  for (const p of ["/api/me", "/api/me/orders", "/api/me/loyalty"]) assert.equal((await s.call(p)).status, 401, p);
  assert.equal((await s.call("/api/me", { cookie: "dezon_sid=verzonnen" })).status, 401);
});
test("inloggen: fout wachtwoord geeft dezelfde melding als onbekende gebruiker, daarna blokkade", async () => {
  const a = await s.call("/api/auth/login", { method: "POST", body: { id: "0611112222", wachtwoord: "fout" } });
  const b = await s.call("/api/auth/login", { method: "POST", body: { id: "0699999999", wachtwoord: "fout" } });
  assert.equal(a.status, 401); assert.equal(a.json.error, b.json.error);
  for (let i = 0; i < 8; i++) await s.call("/api/auth/login", { method: "POST", body: { id: "0611112222", wachtwoord: "nog-fout" } });
  const locked = await s.call("/api/auth/login", { method: "POST", body: { id: "0611112222", wachtwoord: "wachtwoord1" } });
  assert.equal(locked.status, 429);
});
test("uitloggen maakt de sessie ongeldig, ook voor een gekopieerde cookie", async () => {
  const out = await s.call("/api/auth/logout", { method: "POST", cookie });
  assert.match(out.headers.getSetCookie()[0], /Max-Age=0/);
  assert.equal((await s.call("/api/me", { cookie })).status, 401);
});
test("spaarpunten: pas bij ophalen, één keer, en inwisselen controleert het saldo", async () => {
  const t = await boot();
  try {
    const r = await t.call("/api/auth/register", { method: "POST", body: { naam: "Els", telefoon: "0644445555", wachtwoord: "wachtwoord1", akkoord: true } });
    const cookie = r.cookie;
    const o = await t.call("/api/orders", { method: "POST", cookie, body: { lines: [line("frites-groot", 20)], customer, pickup: { asap: true } } });
    assert.equal(o.status, 201); // 8000 cent = 80 punten
    assert.equal((await t.call("/api/me/loyalty", { cookie })).json.balance, 0);
    assert.equal((await t.call("/api/me/loyalty/redeem", { method: "POST", cookie, body: { rewardId: "saus" } })).status, 409);
    const adm = await t.call("/api/admin/login", { method: "POST", body: { wachtwoord: "beheer-wachtwoord-1" } });
    const set = (status) => t.call(`/api/admin/orders/${o.json.order.id}`, { method: "PUT", cookie: adm.cookie, body: { status } });
    assert.equal((await set("opgehaald")).status, 200);
    assert.equal((await set("opgehaald")).status, 200); // opnieuw: geen dubbele punten
    assert.equal((await set("geannuleerd")).status, 409);
    assert.equal((await t.call("/api/me/loyalty", { cookie })).json.balance, 80);
    const v = await t.call("/api/me/loyalty/redeem", { method: "POST", cookie, body: { rewardId: "saus" } });
    assert.equal(v.status, 201);
    assert.match(v.json.code, /^BON-/);
    assert.equal((await t.call("/api/me/loyalty", { cookie })).json.balance, 30);
    assert.equal((await t.call("/api/me/loyalty/redeem", { method: "POST", cookie, body: { rewardId: "saus" } })).status, 409);
  } finally { await t.close(); }
});
test("account verwijderen: wachtwoord nodig, bestellingen blijven maar zonder persoonsgegevens", async () => {
  const t = await boot();
  try {
    const r = await t.call("/api/auth/register", { method: "POST", body: { naam: "Kees", telefoon: "0655556666", wachtwoord: "wachtwoord1", akkoord: true } });
    await t.call("/api/orders", { method: "POST", cookie: r.cookie, body: { lines: [line()], customer: { ...customer, naam: "Kees" }, pickup: { asap: true } } });
    assert.equal((await t.call("/api/me", { method: "DELETE", cookie: r.cookie, body: { wachtwoord: "fout" } })).status, 401);
    assert.equal((await t.call("/api/me", { method: "DELETE", cookie: r.cookie, body: { wachtwoord: "wachtwoord1" } })).status, 200);
    assert.equal((await t.call("/api/me", { cookie: r.cookie })).status, 401);
    const adm = await t.call("/api/admin/login", { method: "POST", body: { wachtwoord: "beheer-wachtwoord-1" } });
    const orders = (await t.call("/api/admin/orders", { cookie: adm.cookie })).json;
    assert.equal(orders[0].customer.naam, "Verwijderd");
    assert.equal(orders[0].customer.telefoon, "");
    assert.equal((await t.call("/api/admin/customers", { cookie: adm.cookie })).json.length, 0);
  } finally { await t.close(); }
});
test("/api/session geeft 200 met user: null voor bezoekers (geen 401 in de console)", async () => {
  const r = await s.call("/api/session");
  assert.equal(r.status, 200);
  assert.equal(r.json.user, null);
  const c = await s.call("/api/auth/register", { method: "POST", body: { naam: "Sam", telefoon: "0699990000", wachtwoord: "wachtwoord1", akkoord: true } });
  assert.equal((await s.call("/api/session", { cookie: c.cookie })).json.user.naam, "Sam");
});
