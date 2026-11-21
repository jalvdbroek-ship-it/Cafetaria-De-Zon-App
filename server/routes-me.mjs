import { randomBytes } from "node:crypto";
import { HttpError, bad, readJson, str } from "./http.mjs";
import { Reply, CUSTOMER_COOKIE, CUSTOMER_TTL } from "./context.mjs";
import { getConfig } from "./data.mjs";
import { hashPassword, verifyPassword, passwordProblem } from "./auth.mjs";
import { validateCheckout, normalizePhone } from "../src/lib/validate.mjs";
import { balance, redeemReward, canRedeem } from "../src/lib/loyalty.mjs";

const profile = (c) => ({ id: c.id, naam: c.naam, telefoon: c.telefoon, email: c.email, cardId: c.cardId, aangemaakt: c.aangemaakt, loggedIn: true });
const identOf = (s) => { const v = String(s || "").trim(); return v.includes("@") ? v.toLowerCase() : normalizePhone(v); };
const DUMMY = "scrypt$16384$00000000000000000000000000000000$" + "0".repeat(64);

function cleanProfile(b) {
  const p = { naam: str(b.naam, 80, "naam"), telefoon: str(b.telefoon, 30, "telefoon"), email: str(b.email, 120, "e-mail") };
  const f = validateCheckout(p);
  delete f.opmerking;
  if (Object.keys(f).length) throw bad("Controleer de gegevens.", f);
  return { ...p, telefoon: normalizePhone(p.telefoon), email: p.email.toLowerCase() };
}

export function meRoutes(ctx) {
  const { store } = ctx;
  const login = (req, customer) => new Reply(200, profile(customer), { "Set-Cookie": ctx.cookie(req, CUSTOMER_COOKIE, ctx.sessions.create("customer", customer.id, CUSTOMER_TTL), CUSTOMER_TTL) });
  const clash = (list, p, selfId) => list.some((c) => c.id !== selfId && (c.telefoon === p.telefoon || (p.email && c.email === p.email)));
  return [
    ["POST", /^\/api\/auth\/register$/, async (req) => {
      ctx.limit(ctx.limiters.register, ctx.ip(req));
      ctx.limiters.register.hit(ctx.ip(req));
      const b = await readJson(req);
      const p = cleanProfile(b);
      const pw = passwordProblem(b.wachtwoord);
      if (pw) throw bad(pw, { wachtwoord: pw });
      if (b.akkoord !== true) throw bad("Ga akkoord met de privacyverklaring om een account te maken.", { akkoord: "Ga akkoord met de privacyverklaring." });
      const hash = await hashPassword(b.wachtwoord);
      const list = store.read("customers", []);
      if (clash(list, p)) throw new HttpError(409, "Er bestaat al een account met dit telefoonnummer of e-mailadres. Log in.");
      const now = ctx.now().toISOString();
      const c = { id: `k_${randomBytes(6).toString("hex")}`, ...p, hash, cardId: ctx.code("ZON-KAART", 6), favorites: [], aangemaakt: now, akkoordOp: now };
      store.write("customers", [...list, c]);
      return login(req, c);
    }],
    ["POST", /^\/api\/auth\/login$/, async (req) => {
      const b = await readJson(req);
      const ident = identOf(b.id), key = `${ctx.ip(req)}|${ident}`;
      ctx.limit(ctx.limiters.loginIp, ctx.ip(req));
      ctx.limit(ctx.limiters.login, key);
      const c = store.read("customers", []).find((x) => ident && (x.telefoon === ident || x.email === ident));
      const ok = await verifyPassword(typeof b.wachtwoord === "string" ? b.wachtwoord : "", c ? c.hash : DUMMY);
      if (!c || !ok) {
        ctx.limiters.login.hit(key); ctx.limiters.loginIp.hit(ctx.ip(req));
        throw new HttpError(401, "Telefoon, e-mail of wachtwoord klopt niet.");
      }
      ctx.limiters.login.reset(key);
      return login(req, c);
    }],
    ["POST", /^\/api\/auth\/logout$/, (req) => {
      ctx.sessions.destroy(ctx.token(req, CUSTOMER_COOKIE));
      return new Reply(200, { ok: true }, { "Set-Cookie": ctx.cookie(req, CUSTOMER_COOKIE, "", 0) });
    }],
    ["GET", /^\/api\/session$/, (req) => { const c = ctx.customer(req); return { user: c ? profile(c) : null }; }],
    ["GET", /^\/api\/me$/, (req) => profile(ctx.requireCustomer(req))],
    ["PUT", /^\/api\/me$/, async (req) => {
      const me = ctx.requireCustomer(req), p = cleanProfile(await readJson(req));
      const list = store.read("customers", []);
      if (clash(list, p, me.id)) throw new HttpError(409, "Dit telefoonnummer of e-mailadres hoort bij een ander account.");
      const next = list.map((c) => (c.id === me.id ? { ...c, ...p } : c));
      store.write("customers", next);
      return profile(next.find((c) => c.id === me.id));
    }],
    ["DELETE", /^\/api\/me$/, async (req) => {
      const me = ctx.requireCustomer(req), b = await readJson(req);
      ctx.limit(ctx.limiters.login, `${ctx.ip(req)}|del`);
      if (!(await verifyPassword(typeof b.wachtwoord === "string" ? b.wachtwoord : "", me.hash))) { ctx.limiters.login.hit(`${ctx.ip(req)}|del`); throw new HttpError(401, "Wachtwoord klopt niet."); }
      store.write("customers", store.read("customers", []).filter((c) => c.id !== me.id));
      store.update("ledger", {}, (l) => { delete l[me.id]; });
      // Bestellingen blijven voor de administratie, maar zonder persoonsgegevens.
      store.update("orders", [], (os) => os.map((o) => (o.customerId === me.id ? { ...o, customerId: null, customer: { naam: "Verwijderd", telefoon: "", email: "", opmerking: "" } } : o)));
      store.update("vouchers", [], (vs) => vs.map((v) => (v.customerId === me.id ? { ...v, customerId: null } : v)));
      ctx.sessions.destroyCustomer(me.id);
      return new Reply(200, { ok: true }, { "Set-Cookie": ctx.cookie(req, CUSTOMER_COOKIE, "", 0) });
    }],
    ["GET", /^\/api\/me\/orders$/, (req) => { const me = ctx.requireCustomer(req); return store.read("orders", []).filter((o) => o.customerId === me.id).map((o) => ctx.view(o)); }],
    ["GET", /^\/api\/me\/loyalty$/, (req) => {
      const me = ctx.requireCustomer(req), entries = store.read("ledger", {})[me.id] || [];
      return { balance: balance(entries), entries: [...entries].reverse(), vouchers: store.read("vouchers", []).filter((v) => v.customerId === me.id) };
    }],
    ["POST", /^\/api\/me\/loyalty\/redeem$/, async (req) => {
      const me = ctx.requireCustomer(req), b = await readJson(req);
      const reward = getConfig(store).loyalty.rewards.find((r) => r.id === b.rewardId);
      const entries = store.read("ledger", {})[me.id] || [];
      if (!reward) throw bad("Onbekende beloning.");
      if (!canRedeem(entries, reward)) throw new HttpError(409, "Onvoldoende punten voor deze beloning.");
      const code = ctx.code("BON"), now = ctx.now();
      store.update("ledger", {}, (l) => { l[me.id] = redeemReward(entries, reward, now, code); });
      const voucher = { code, type: "beloning", naam: reward.naam, customerId: me.id, aangemaakt: now.toISOString(), geldigTot: new Date(now.getTime() + 90 * 86400000).toISOString(), status: "open" };
      store.update("vouchers", [], (v) => { v.unshift(voucher); });
      return new Reply(201, voucher);
    }],
    ["GET", /^\/api\/me\/favorites$/, (req) => ctx.requireCustomer(req).favorites || []],
    ["PUT", /^\/api\/me\/favorites\/([a-z0-9-]{1,60})$/, (req, res, m) => setFav(ctx, req, m[1], true)],
    ["DELETE", /^\/api\/me\/favorites\/([a-z0-9-]{1,60})$/, (req, res, m) => setFav(ctx, req, m[1], false)],
  ];
}

function setFav(ctx, req, id, on) {
  const me = ctx.requireCustomer(req);
  if (on && !ctx.store.read("menu").producten.some((p) => p.id === id)) throw bad("Onbekend product.");
  const favs = on ? [...new Set([...(me.favorites || []), id])].slice(-100) : (me.favorites || []).filter((x) => x !== id);
  ctx.store.update("customers", [], (l) => { const c = l.find((x) => x.id === me.id); if (c) c.favorites = favs; });
  return favs;
}
