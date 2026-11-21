import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { boot, customer, line, PNG } from "./server-helpers.mjs";

let s, adm;
before(async () => { s = await boot(); adm = (await s.call("/api/admin/login", { method: "POST", body: { wachtwoord: "beheer-wachtwoord-1" } })).cookie; });
after(async () => { await s.close(); });
const A = (path, opts = {}) => s.call(path, { cookie: adm, ...opts });

test("beheer-routes vragen een beheersessie; een klantsessie is niet genoeg", async () => {
  for (const [m, p] of [["GET", "/api/admin/stats"], ["GET", "/api/admin/orders"], ["GET", "/api/admin/customers"], ["PUT", "/api/admin/menu"], ["PUT", "/api/admin/config"], ["POST", "/api/admin/upload"], ["GET", "/api/admin/vouchers"]]) {
    assert.equal((await s.call(p, { method: m, body: m === "GET" ? undefined : {} })).status, 401, p);
  }
  const c = await s.call("/api/auth/register", { method: "POST", body: { naam: "Klant", telefoon: "0677778888", wachtwoord: "wachtwoord1", akkoord: true } });
  assert.equal((await s.call("/api/admin/stats", { cookie: c.cookie })).status, 401);
  assert.equal((await s.call("/api/admin/stats", { cookie: "dezon_admin=verzonnen" })).status, 401);
});
test("beheer staat uit zonder wachtwoord (of een te kort wachtwoord)", async () => {
  for (const pw of ["", "kort"]) {
    const t = await boot({ adminPassword: pw });
    try {
      const r = await t.call("/api/admin/login", { method: "POST", body: { wachtwoord: pw } });
      assert.equal(r.status, 503);
      assert.equal((await t.call("/api/health")).json.adminEnabled, false);
    } finally { await t.close(); }
  }
});
test("beheerlogin: fout wachtwoord en blokkade na vijf pogingen", async () => {
  const t = await boot();
  try {
    for (let i = 0; i < 5; i++) assert.equal((await t.call("/api/admin/login", { method: "POST", body: { wachtwoord: "fout" } })).status, 401);
    assert.equal((await t.call("/api/admin/login", { method: "POST", body: { wachtwoord: "beheer-wachtwoord-1" } })).status, 429);
  } finally { await t.close(); }
});
test("menu opslaan: prijs, uitverkocht en nieuwe categorie werken door in bestellen", async () => {
  const menu = (await s.call("/api/menu")).json;
  menu.producten.find((p) => p.id === "kroket").uitverkocht = true;
  menu.producten.find((p) => p.id === "frikandel").prijs = 999;
  assert.equal((await A("/api/admin/menu", { method: "PUT", body: { menu } })).status, 200);
  const o = (id) => s.call("/api/orders", { method: "POST", body: { lines: [line(id, 1)], customer, pickup: { asap: true } } });
  assert.equal((await o("kroket")).status, 409);
  assert.equal((await o("frikandel")).json.order.total, 999);
});
test("menu opslaan weigert kapotte gegevens en onbestaande of vreemde foto's", async () => {
  const base = (await s.call("/api/menu")).json;
  const tryMenu = async (mut) => { const m = structuredClone(base); mut(m); return (await A("/api/admin/menu", { method: "PUT", body: { menu: m } })).status; };
  assert.equal(await tryMenu((m) => { m.producten[0].prijs = -5; }), 422);
  assert.equal(await tryMenu((m) => { m.producten[0].prijs = 1.5; }), 422);
  assert.equal(await tryMenu((m) => { m.producten[0].categorie = "nep"; }), 422);
  assert.equal(await tryMenu((m) => { m.producten[0].foto = "https://kwaad.example/x.png"; }), 422);
  assert.equal(await tryMenu((m) => { m.producten[0].foto = "uploads/../../etc/passwd"; }), 422);
  assert.equal(await tryMenu((m) => { m.producten[0].foto = `uploads/${"a".repeat(32)}.png`; }), 422);
  assert.equal(await tryMenu((m) => { m.producten[0].id = "Spaties En Hoofdletters"; }), 422);
  assert.equal((await A("/api/admin/menu", { method: "PUT", body: { menu: "x" } })).status, 422);
});
test("config en tijden: waarden worden gecontroleerd", async () => {
  const put = (body) => A("/api/admin/config", { method: "PUT", body });
  assert.equal((await put({ pickup: { intervalMin: 1, leadMin: 15 } })).status, 422);
  assert.equal((await put({ loyalty: { pointsPerEuro: 99, rewards: [] } })).status, 422);
  assert.equal((await put({ jackpot: { prizes: [] } })).status, 422);
  assert.equal((await put({ jackpot: { enabled: true, minTotal: 1500 } })).status, 200);
  assert.equal((await s.call("/api/config")).json.config.jackpot.minTotal, 1500);
  assert.equal((await A("/api/admin/site", { method: "PUT", body: { hours: { 0: ["25:00", "21:00"] } } })).status, 422);
  const hours = (await s.call("/api/config")).json.site.hours;
  assert.equal((await A("/api/admin/site", { method: "PUT", body: { hours } })).status, 200);
});
test("acties: knoppen mogen niet naar javascript: wijzen", async () => {
  const p = (href) => A("/api/admin/promos", { method: "PUT", body: { promos: [{ id: "a", titel: "T", tekst: "x", actief: true, knop: { label: "Ga", href } }] } });
  assert.equal((await p("javascript:alert(1)")).status, 422);
  assert.equal((await p("http://onveilig.example")).status, 422);
  assert.equal((await p("#/menu/ijs")).status, 200);
  assert.equal((await p("https://example.org/x")).status, 200);
});
test("upload: png wordt bewaard onder een eigen naam en is te gebruiken als productfoto", async () => {
  const up = await A("/api/admin/upload", { method: "POST", raw: PNG, headers: { "Content-Type": "image/png" } });
  assert.equal(up.status, 201);
  assert.match(up.json.url, /^uploads\/[a-f0-9]{32}\.png$/);
  const get = await fetch(`${s.base}/${up.json.url}`);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("content-type"), "image/png");
  assert.equal(get.headers.get("x-content-type-options"), "nosniff");
  const menu = (await s.call("/api/menu")).json;
  menu.producten[0].foto = up.json.url;
  assert.equal((await A("/api/admin/menu", { method: "PUT", body: { menu } })).status, 200);
});
test("upload: svg, html, verkeerde bytes, leeg en te groot worden geweigerd", async () => {
  const up = (raw, type) => A("/api/admin/upload", { method: "POST", raw, headers: { "Content-Type": type } });
  assert.equal((await up("<svg onload=alert(1)></svg>", "image/svg+xml")).status, 415);
  assert.equal((await up("<script>alert(1)</script>", "image/png")).status, 415);
  assert.equal((await up(Buffer.from("GIF89a....................."), "image/png")).status, 415);
  assert.equal((await up(Buffer.alloc(0), "image/png")).status, 422);
  assert.equal((await up(Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]), "image/png")).status, 413);
  assert.equal((await s.call("/api/admin/upload", { method: "POST", raw: PNG, headers: { "Content-Type": "image/png" } })).status, 401);
});
test("bestanden buiten de app zijn niet bereikbaar (padtraversal, data, server)", async () => {
  const paths = ["/uploads/../config.json", "/uploads/%2e%2e%2fconfig.json", "/uploads/..%5Cconfig.json", "/uploads/sessions.json", "/uploads/", "/data/config.json", "/data/sessions.json", "/server/api.mjs", "/server.js", "/package.json", "/tests/server-api.test.mjs", "/%2e%2e/package.json", "/.git/config", "/src/%2e%2e/server.js", "/index.html%00.png"];
  for (const p of paths) { const r = await fetch(s.base + p); assert.equal(r.status, 404, `${p} gaf ${r.status}`); }
  assert.equal((await fetch(`${s.base}/src/app.js`)).status, 200);
  assert.equal((await fetch(`${s.base}/`)).headers.get("content-security-policy").includes("frame-ancestors 'none'"), true);
});
test("dashboard: cijfers van vandaag", async () => {
  const st = (await A("/api/admin/stats")).json;
  assert.ok(st.ordersToday >= 1);
  assert.ok(st.revenueToday >= 999);
  assert.ok(st.open >= 1);
  assert.ok(Array.isArray(st.popular));
});
