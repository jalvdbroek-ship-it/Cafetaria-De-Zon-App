import { randomBytes } from "node:crypto";
import { HttpError, bad, readJson, str } from "./http.mjs";
import { Reply, sha } from "./context.mjs";
import { getMenu, getPromos, getConfig, getSite, publicJackpot, DAY_ORDER_LIMIT_CENTS } from "./data.mjs";
import { indexMenu, priceCart, cartReducer, emptyCart, MAX_QTY } from "../src/lib/cart.mjs";
import { validateCheckout, normalizePhone } from "../src/lib/validate.mjs";
import { pointsForOrder } from "../src/lib/loyalty.mjs";
import { odds, qualifies, resolveSpin } from "../src/lib/jackpot.mjs";
import { openStatus } from "../src/lib/hours.mjs";

const HORIZON_MS = 3 * 86400000;

function parseLines(raw, idx) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 40) throw bad("De bestelling is leeg of te groot.");
  let cart = emptyCart();
  for (const l of raw) {
    const sel = l?.selection ?? {};
    const okSel = sel && typeof sel === "object" && !Array.isArray(sel) && Object.values(sel).every((ids) => Array.isArray(ids) && ids.length <= 30 && ids.every((x) => typeof x === "string"));
    if (!l || typeof l.productId !== "string" || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY || !okSel) throw bad("Een regel in de bestelling klopt niet.");
    try { cart = cartReducer(cart, { type: "add", productId: l.productId, selection: sel, qty: l.qty }, idx); }
    catch (e) { throw new HttpError(409, "Een of meer producten zijn niet beschikbaar. Pas je mandje aan."); }
  }
  return cart.lines;
}

function checkPickup(p, now, hours) {
  if (!p || typeof p !== "object") throw bad("Kies een afhaalmoment.", { pickup: "Kies een afhaalmoment." });
  if (p.asap === true) {
    if (!openStatus(now, hours).open) throw bad("De Zon is nu gesloten. Kies een afhaalmoment.", { pickup: "De Zon is nu gesloten. Kies een tijd." });
    return { asap: true };
  }
  const at = typeof p.at === "string" ? new Date(p.at) : null;
  if (!at || Number.isNaN(at.getTime())) throw bad("Kies een afhaalmoment.", { pickup: "Kies een afhaalmoment." });
  if (at.getTime() < now.getTime() - 5 * 60000 || at.getTime() > now.getTime() + HORIZON_MS || !openStatus(at, hours).open) throw bad("Dit afhaalmoment kan niet.", { pickup: "Dit afhaalmoment kan niet. Kies een andere tijd." });
  return { asap: false, at: at.toISOString(), label: str(p.label, 40, "label") };
}

function authorOrder(ctx, req, o) {
  const tok = req.headers["x-order-token"];
  const mine = ctx.customer(req);
  const byToken = typeof tok === "string" && tok.length < 100 && o.tokenHash && sha(tok) === o.tokenHash;
  if (!byToken && !(mine && o.customerId === mine.id)) throw new HttpError(404, "Bestelling niet gevonden.");
}

export function shopRoutes(ctx) {
  const { store } = ctx;
  const findOrder = (id) => { const o = store.read("orders", []).find((x) => x.id === id); if (!o) throw new HttpError(404, "Bestelling niet gevonden."); return o; };
  return [
    ["GET", /^\/api\/health$/, () => ({ ok: true, mode: "live", adminEnabled: ctx.adminEnabled })],
    ["GET", /^\/api\/menu$/, () => getMenu(store)],
    ["GET", /^\/api\/promos$/, () => getPromos(store).filter((p) => p.actief !== false)],
    ["GET", /^\/api\/config$/, () => {
      const c = getConfig(store);
      return { config: { demo: false, pickup: c.pickup, loyalty: c.loyalty, jackpot: publicJackpot(c.jackpot, odds) }, site: getSite(store) };
    }],
    ["POST", /^\/api\/orders$/, async (req) => {
      ctx.limit(ctx.limiters.order, ctx.ip(req));
      const body = await readJson(req);
      const c = body.customer && typeof body.customer === "object" ? body.customer : {};
      const customer = { naam: str(c.naam, 80, "naam"), telefoon: str(c.telefoon, 30, "telefoon"), email: str(c.email, 120, "e-mail"), opmerking: str(c.opmerking, 200, "opmerking") };
      const fields = validateCheckout(customer);
      if (Object.keys(fields).length) throw bad("Controleer de gegevens.", fields);
      const menu = getMenu(store), idx = indexMenu(menu), now = ctx.now(), site = getSite(store), config = getConfig(store);
      const pickup = checkPickup(body.pickup, now, site.hours);
      const lines = parseLines(body.lines, idx);
      const priced = priceCart({ lines }, idx);
      if (priced.unavailable.length) throw new HttpError(409, "Een of meer producten zijn niet beschikbaar. Pas je mandje aan.");
      if (priced.subtotal > DAY_ORDER_LIMIT_CENTS) throw bad("Dit is een grote bestelling. Bel De Zon, dan regelen we het samen.");
      ctx.limiters.order.hit(ctx.ip(req));
      const me = ctx.customer(req), token = randomBytes(24).toString("base64url");
      const orders = store.read("orders", []);
      let id;
      do { id = ctx.code("ZON"); } while (orders.some((o) => o.id === id));
      const order = {
        id, createdAt: now.toISOString(), status: "ontvangen", tokenHash: sha(token), customerId: me?.id || null,
        lines: priced.lines.map((l) => ({ productId: l.productId, selection: l.selection, naam: l.product.naam, qty: l.qty, unit: l.unit, total: l.total, optionNames: l.optionNames })),
        total: priced.subtotal,
        customer: { ...customer, telefoon: normalizePhone(customer.telefoon) },
        pickup, betaling: { methode: "bij afhalen", status: "nog te betalen" },
        pointsExpected: me ? pointsForOrder(priced.subtotal, config.loyalty) : 0, pointsCredited: false,
        jackpotMogelijk: qualifies(config.jackpot, priced.subtotal),
      };
      store.write("orders", [order, ...orders]);
      return new Reply(201, { order: ctx.view(order), token });
    }],
    ["GET", /^\/api\/orders\/(ZON-[A-Z0-9]{5})$/, (req, res, m) => { const o = findOrder(m[1]); authorOrder(ctx, req, o); return { order: ctx.view(o) }; }],
    ["POST", /^\/api\/orders\/(ZON-[A-Z0-9]{5})\/spin$/, (req, res, m) => {
      ctx.limit(ctx.limiters.spin, ctx.ip(req));
      ctx.limiters.spin.hit(ctx.ip(req));
      const o = findOrder(m[1]);
      authorOrder(ctx, req, o);
      if (o.status === "geannuleerd") throw new HttpError(409, "Deze bestelling is geannuleerd.");
      // Alles hieronder is synchroon: twee gelijktijdige verzoeken kunnen dus nooit allebei een nieuwe draai maken.
      const spins = store.read("spins", {});
      let out;
      try { out = resolveSpin(getConfig(store).jackpot, o, spins[o.id], { now: ctx.now() }); }
      catch (e) { throw new HttpError(409, e.message); }
      if (out.isNew) {
        store.write("spins", { ...spins, [o.id]: out.spin });
        store.update("vouchers", [], (v) => { v.unshift({ code: out.spin.code, type: "jackpot", naam: out.spin.naam, orderId: o.id, customerId: o.customerId, aangemaakt: out.spin.at, geldigTot: out.spin.geldigTot, status: "open" }); });
      }
      return { spin: out.spin, isNew: out.isNew };
    }],
  ];
}
