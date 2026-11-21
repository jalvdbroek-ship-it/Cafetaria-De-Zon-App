import { existsSync } from "node:fs";
import { HttpError, bad, readJson, readBody } from "./http.mjs";
import { Reply, ADMIN_COOKIE, ADMIN_TTL } from "./context.mjs";
import { getConfig } from "./data.mjs";
import { saveUpload, uploadPath, MAX_UPLOAD } from "./upload.mjs";
import { menuProblem } from "../src/lib/datasource.mjs";
import { jackpotProblem } from "../src/lib/jackpot.mjs";
import { dayStats, STATUSES } from "../src/lib/stats.mjs";
import { pointsForOrder, earn } from "../src/lib/loyalty.mjs";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

export function configProblem(p, current) {
  if (p.pickup !== undefined) {
    const k = p.pickup;
    if (!k || !int(k.intervalMin, 5, 60) || !int(k.leadMin, 0, 120) || !int(k.lastBeforeCloseMin ?? 15, 0, 120)) return "Afhalen: slot 5 tot 60 minuten, voorbereiding 0 tot 120 minuten.";
  }
  if (p.loyalty !== undefined) {
    const l = p.loyalty;
    if (!l || !int(l.pointsPerEuro, 0, 10) || !Array.isArray(l.rewards) || l.rewards.length > 20) return "Spaarregels: punten per euro 0 tot 10 en maximaal 20 beloningen.";
    const ids = new Set();
    for (const r of l.rewards) {
      if (!r || typeof r.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(r.id) || ids.has(r.id) || typeof r.naam !== "string" || !r.naam.trim() || r.naam.length > 40 || !int(r.punten, 1, 5000)) return "Elke beloning heeft een unieke code, een naam en 1 tot 5000 punten.";
      ids.add(r.id);
    }
  }
  if (p.jackpot !== undefined) return jackpotProblem({ ...current.jackpot, ...p.jackpot });
  return null;
}
export function hoursProblem(h) {
  if (!h || typeof h !== "object") return "Openingstijden ontbreken.";
  for (let d = 0; d < 7; d++) {
    const w = h[String(d)];
    if (w !== null && !(Array.isArray(w) && w.length === 2 && TIME.test(w[0]) && TIME.test(w[1]))) return "Elke dag is dicht of heeft een opening en sluiting (uu:mm).";
  }
  return null;
}
export function promosProblem(list) {
  if (!Array.isArray(list) || list.length > 50) return "Acties moeten een lijst van maximaal 50 zijn.";
  const ids = new Set();
  for (const p of list) {
    if (!p || typeof p.id !== "string" || !/^[a-z0-9-]{1,60}$/.test(p.id) || ids.has(p.id)) return "Elke actie heeft een unieke code.";
    ids.add(p.id);
    if (typeof p.titel !== "string" || !p.titel.trim() || p.titel.length > 80 || typeof p.tekst !== "string" || p.tekst.length > 300) return "Titel (max 80) en tekst (max 300) zijn verplicht.";
    for (const k of ["vanaf", "tot"]) if (p[k] && !/^\d{4}-\d{2}-\d{2}$/.test(p[k])) return "Datums zijn jjjj-mm-dd.";
    if (p.knop && (typeof p.knop.label !== "string" || p.knop.label.length > 40 || !/^(#\/[a-z0-9/-]*|https:\/\/[^\s"'<>]{1,200})$/.test(String(p.knop.href)))) return "Een knop wijst naar een scherm in de app (#/...) of een https-adres.";
  }
  return null;
}

export function adminRoutes(ctx) {
  const { store } = ctx;
  const A = (fn) => async (req, res, m, q) => { ctx.requireAdmin(req); return fn(req, res, m, q); };
  const put = (name, check) => A(async (req) => {
    const b = await readJson(req, 512 * 1024);
    const v = name === "menu" || name === "promos" ? b[name] : b;
    const p = check(v); if (p) throw bad(p);
    store.write(name, v);
    return { ok: true };
  });
  return [
    ["POST", /^\/api\/admin\/login$/, async (req) => {
      if (!ctx.adminEnabled) throw new HttpError(503, "Beheer staat uit: de eigenaar moet DEZON_ADMIN_PASSWORD (minimaal 10 tekens) instellen op de server.");
      const key = ctx.ip(req);
      ctx.limit(ctx.limiters.admin, key);
      const b = await readJson(req, 2048);
      if (!ctx.checkAdminPassword(b.wachtwoord)) { ctx.limiters.admin.hit(key); throw new HttpError(401, "Dit wachtwoord klopt niet."); }
      ctx.limiters.admin.reset(key);
      return new Reply(200, { ok: true }, { "Set-Cookie": ctx.cookie(req, ADMIN_COOKIE, ctx.sessions.create("admin", null, ADMIN_TTL), ADMIN_TTL) });
    }],
    ["POST", /^\/api\/admin\/logout$/, (req) => { ctx.sessions.destroy(ctx.token(req, ADMIN_COOKIE)); return new Reply(200, { ok: true }, { "Set-Cookie": ctx.cookie(req, ADMIN_COOKIE, "", 0) }); }],
    ["GET", /^\/api\/admin\/session$/, (req) => ({ admin: Boolean(ctx.session(req, ADMIN_COOKIE, "admin")), enabled: ctx.adminEnabled })],
    ["GET", /^\/api\/admin\/stats$/, A(() => dayStats(store.read("orders", []), store.read("customers", []), ctx.now()))],
    ["GET", /^\/api\/admin\/orders$/, A((req, res, m, q) => {
      const st = q.get("status");
      let list = store.read("orders", []);
      if (st === "open") list = list.filter((o) => ["ontvangen", "in bereiding", "klaar"].includes(o.status));
      else if (STATUSES.includes(st)) list = list.filter((o) => o.status === st);
      return list.slice(0, 200).map((o) => ctx.view(o));
    })],
    ["PUT", /^\/api\/admin\/orders\/(ZON-[A-Z0-9]{5})$/, A(async (req, res, m) => {
      const b = await readJson(req, 2048);
      if (!STATUSES.includes(b.status)) throw bad("Onbekende status.");
      const o = store.read("orders", []).find((x) => x.id === m[1]);
      if (!o) throw new HttpError(404, "Bestelling niet gevonden.");
      if (["opgehaald", "geannuleerd"].includes(o.status) && o.status !== b.status) throw new HttpError(409, "Een afgeronde bestelling kan niet meer wijzigen.");
      const now = ctx.now();
      // Spaarpunten pas bij ophalen, en maar één keer.
      if (b.status === "opgehaald" && o.customerId && !o.pointsCredited) {
        const pts = pointsForOrder(o.total, getConfig(store).loyalty);
        store.update("ledger", {}, (l) => { l[o.customerId] = earn(l[o.customerId] || [], pts, now, o.id, `Bestelling ${o.id}`); });
        o.pointsEarned = pts; o.pointsCredited = true;
      }
      o.status = b.status; o.statusAt = now.toISOString();
      store.update("orders", [], (os) => os.map((x) => (x.id === o.id ? o : x)));
      return { order: ctx.view(o) };
    })],
    ["GET", /^\/api\/admin\/customers$/, A(() => {
      const orders = store.read("orders", []), ledger = store.read("ledger", {});
      return store.read("customers", []).map(({ hash, favorites, ...c }) => ({ ...c, bestellingen: orders.filter((o) => o.customerId === c.id).length, punten: (ledger[c.id] || []).reduce((s, e) => s + (e.type === "earn" ? e.points : -e.points), 0) }));
    })],
    ["GET", /^\/api\/admin\/jackpot$/, A(() => getConfig(store).jackpot)],
    ["GET", /^\/api\/admin\/vouchers$/, A(() => store.read("vouchers", []).slice(0, 300))],
    ["PUT", /^\/api\/admin\/vouchers\/((?:BON|JKP)-[A-Z2-9]{5})$/, A(async (req, res, m) => {
      const b = await readJson(req, 1024);
      if (b.status !== "verzilverd") throw bad("Een bon kan alleen op verzilverd worden gezet.");
      let out;
      store.update("vouchers", [], (vs) => {
        const v = vs.find((x) => x.code === m[1]);
        if (!v) throw new HttpError(404, "Bon niet gevonden.");
        if (v.status !== "open") throw new HttpError(409, "Deze bon is al gebruikt.");
        if (new Date(v.geldigTot) < ctx.now()) throw new HttpError(409, "Deze bon is verlopen.");
        v.status = "verzilverd"; v.verzilverdOp = ctx.now().toISOString(); out = v;
      });
      return out;
    })],
    ["PUT", /^\/api\/admin\/menu$/, put("menu", (menu) => menuProblem(menu) || fotoProblem(ctx, menu))],
    ["PUT", /^\/api\/admin\/promos$/, put("promos", promosProblem)],
    ["PUT", /^\/api\/admin\/site$/, A(async (req) => { const b = await readJson(req); const p = hoursProblem(b.hours); if (p) throw bad(p); store.write("site", { hours: b.hours }); return { ok: true }; })],
    ["PUT", /^\/api\/admin\/config$/, A(async (req) => {
      const b = await readJson(req), cur = getConfig(store);
      const p = configProblem(b, cur); if (p) throw bad(p);
      const next = { ...cur };
      for (const k of ["pickup", "loyalty"]) if (b[k] !== undefined) next[k] = b[k];
      if (b.jackpot !== undefined) next.jackpot = { ...cur.jackpot, ...b.jackpot };
      store.write("config", next);
      return { ok: true };
    })],
    ["POST", /^\/api\/admin\/upload$/, A(async (req) => {
      if (!/^image\/(webp|jpeg|png)$/.test(req.headers["content-type"] || "")) throw new HttpError(415, "Alleen webp, jpg en png zijn toegestaan.");
      const r = saveUpload(ctx.uploadDir, await readBody(req, MAX_UPLOAD));
      return new Reply(201, { url: r.url });
    })],
  ];
}

function fotoProblem(ctx, menu) {
  for (const p of menu.producten) {
    if (p.foto == null || p.foto === "") continue;
    const up = /^uploads\/([a-f0-9]{32}\.(?:webp|jpg|png))$/.exec(p.foto);
    if (up) { const f = uploadPath(ctx.uploadDir, up[1]); if (!f || !existsSync(f)) return `De foto van "${p.naam}" bestaat niet (meer). Upload hem opnieuw.`; }
    else if (!/^public\/img\/foto\/[a-z0-9-]+\.webp$/.test(p.foto)) return `Ongeldige foto bij "${p.naam}".`;
  }
  return null;
}
