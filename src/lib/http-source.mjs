// Bron die met de De Zon-server praat (zelfde methoden als LocalDemoSource). Cookies regelt de browser; er staat niets geheims in de pagina.
// Winkelmandje, instellingen, gastgegevens en bestelsleuteltjes blijven op het toestel (via de gedeelde basisklasse).
import { LocalDemoSource, ValidationError } from "./datasource.mjs";

const P = "dezon.v1.";

export class HttpSource extends LocalDemoSource {
  mode = "live";
  caps = { accounts: true, upload: true, backup: false };
  #user = null;
  #cfg = null;

  constructor({ base = "", storage, session, now, fetchImpl } = {}) {
    super({ storage, session, now });
    this.baseUrl = base;
    this.fetch = fetchImpl || ((...a) => globalThis.fetch(...a));
  }

  async api(path, { method = "GET", body, headers = {}, raw } = {}) {
    const url = new URL(path, this.baseUrl || globalThis.location?.href);
    const init = { method, credentials: "same-origin", headers: { ...(method === "GET" ? {} : { "X-Dezon": "1" }), ...headers } };
    if (raw !== undefined) init.body = raw;
    else if (body !== undefined) { init.body = JSON.stringify(body); init.headers["Content-Type"] = "application/json"; }
    let res;
    try { res = await this.fetch(url, init); } catch { throw new Error("Geen verbinding met De Zon. Controleer je internet en probeer het opnieuw."); }
    let data = null;
    try { data = await res.json(); } catch { /* geen JSON-antwoord */ }
    if (!res.ok) {
      if (res.status === 422 && data?.fields) throw new ValidationError(data.fields, data.error);
      const e = new Error(data?.error || `Er ging iets mis (${res.status}).`);
      e.status = res.status;
      throw e;
    }
    return data;
  }

  async #config() {
    // Menu, tijden en regels komen uit één antwoord; even onthouden zodat een scherm niet twee keer vraagt.
    if (!this.#cfg || Date.now() - this.#cfg.at > 800) this.#cfg = { at: Date.now(), p: this.api("api/config") };
    return this.#cfg.p;
  }
  #forget() { this.#cfg = null; }

  getMenu() { return this.api("api/menu"); }
  getPromos() { return this.api("api/promos"); }
  async getConfig() { return (await this.#config()).config; }
  async getSite() { return (await this.#config()).site; }
  async jackpotInfo() { return (await this.getConfig()).jackpot; }

  async saveMenu(menu) { await this.api("api/admin/menu", { method: "PUT", body: { menu } }); }
  async savePromos(promos) { await this.api("api/admin/promos", { method: "PUT", body: { promos } }); this.#forget(); }
  async saveConfig(patch) { await this.api("api/admin/config", { method: "PUT", body: patch }); this.#forget(); }
  async saveSite(patch) { await this.api("api/admin/site", { method: "PUT", body: patch }); this.#forget(); }
  async resetAdmin() { throw new Error("Terugzetten kan alleen in de demo."); }
  async exportAdmin() { throw new Error("Maak een back-up van de map data/ op de server."); }
  async importAdmin() { throw new Error("Importeren kan alleen in de demo."); }

  async isAdmin() { try { return (await this.api("api/admin/session")).admin; } catch { return false; } }
  async adminLogin(wachtwoord) {
    try { await this.api("api/admin/login", { method: "POST", body: { wachtwoord } }); return true; }
    catch (e) { if (e.status === 401) return false; throw e; }
  }
  async adminLogout() { await this.api("api/admin/logout", { method: "POST", body: {} }); }
  adminStats() { return this.api("api/admin/stats"); }
  adminOrders(status) { return this.api(`api/admin/orders${status ? `?status=${encodeURIComponent(status)}` : ""}`); }
  async adminSetStatus(id, status) { return (await this.api(`api/admin/orders/${id}`, { method: "PUT", body: { status } })).order; }
  adminCustomers() { return this.api("api/admin/customers"); }
  adminJackpot() { return this.api("api/admin/jackpot"); }
  adminVouchers() { return this.api("api/admin/vouchers"); }
  adminRedeemVoucher(code) { return this.api(`api/admin/vouchers/${code}`, { method: "PUT", body: { status: "verzilverd" } }); }
  async uploadPhoto(file) {
    if (!file || !/^image\/(webp|jpeg|png)$/.test(file.type)) throw new Error("Kies een webp-, jpg- of png-foto.");
    if (file.size > 2 * 1024 * 1024) throw new Error("De foto is groter dan 2 MB.");
    return (await this.api("api/admin/upload", { method: "POST", raw: file, headers: { "Content-Type": file.type } })).url;
  }

  #local(key, fallback) { try { const r = this.storage.getItem(P + key); return r == null ? fallback : JSON.parse(r); } catch { return fallback; } }
  #save(key, v) { this.storage.setItem(P + key, JSON.stringify(v)); }
  #tokenOf(orderId) { return this.#local("myorders", []).find((o) => o.id === orderId)?.token; }

  async me() {
    if (!this.#user || Date.now() - this.#user.at > 1000) {
      this.#user = { at: Date.now(), p: this.api("api/session").then((r) => r.user) };
    }
    return this.#user.p;
  }
  #reset() { this.#user = null; }
  async register(data) { const me = await this.api("api/auth/register", { method: "POST", body: data }); this.#reset(); return me; }
  async login(data) { const me = await this.api("api/auth/login", { method: "POST", body: data }); this.#reset(); return me; }
  async logout() { await this.api("api/auth/logout", { method: "POST", body: {} }); this.#reset(); }
  async deleteAccount(wachtwoord) { await this.api("api/me", { method: "DELETE", body: { wachtwoord } }); this.#reset(); }

  async getAccount() {
    const me = await this.me();
    return me ? { naam: me.naam, telefoon: me.telefoon, email: me.email, cardId: me.cardId, loggedIn: true } : { ...(await super.getAccount()), loggedIn: false };
  }
  async saveAccount(a) {
    if (!(await this.me())) return super.saveAccount(a);
    await this.api("api/me", { method: "PUT", body: { naam: a.naam, telefoon: a.telefoon, email: a.email } });
    this.#reset();
  }

  async placeOrder({ lines, customer, pickup }) {
    const body = {
      lines: lines.map((l) => ({ productId: l.productId, selection: l.selection || {}, qty: l.qty })),
      customer: { naam: customer.naam, telefoon: customer.telefoon, email: customer.email || "", opmerking: customer.opmerking || "" },
      pickup: pickup.asap ? { asap: true } : { at: pickup.at, label: pickup.label || "" },
    };
    const { order, token } = await this.api("api/orders", { method: "POST", body });
    this.#save("myorders", [{ id: order.id, token }, ...this.#local("myorders", [])].slice(0, 20));
    return order;
  }
  async listOrders() {
    if (await this.me()) return this.api("api/me/orders");
    const mine = this.#local("myorders", []);
    const got = await Promise.all(mine.map((m) => this.api(`api/orders/${m.id}`, { headers: { "X-Order-Token": m.token } }).then((r) => r.order, (e) => (e.status === 404 ? "weg" : null))));
    const keep = mine.filter((_, i) => got[i] !== "weg");
    if (keep.length !== mine.length) this.#save("myorders", keep);
    return got.filter((o) => o && o !== "weg");
  }

  async spin(orderId) {
    const token = this.#tokenOf(orderId);
    const me = await this.me();
    if (!token && !me) throw new Error("Deze bestelling hoort niet bij dit toestel.");
    return this.api(`api/orders/${orderId}/spin`, { method: "POST", headers: token ? { "X-Order-Token": token } : {}, body: {} });
  }
  async getSpin(orderId) {
    const token = this.#tokenOf(orderId);
    if (!token && !(await this.me())) return null;
    return (await this.api(`api/orders/${orderId}`, { headers: token ? { "X-Order-Token": token } : {} })).order.spin;
  }

  async getLoyalty() {
    if (await this.me()) return this.api("api/me/loyalty");
    const orders = await this.listOrders();
    const vouchers = orders.filter((o) => o.spin).map((o) => ({ ...o.spin, type: "jackpot", date: o.spin.at, aangemaakt: o.spin.at }));
    return { balance: 0, entries: [], vouchers, guest: true };
  }
  async redeem(rewardId) {
    if (!(await this.me())) throw new Error("Log in om punten in te wisselen.");
    return this.api("api/me/loyalty/redeem", { method: "POST", body: { rewardId } });
  }
  async getCardId() { const me = await this.me(); return me ? me.cardId : ""; }
  async getFavorites() { return (await this.me()) ? this.api("api/me/favorites") : super.getFavorites(); }
  async toggleFavorite(id) {
    if (!(await this.me())) return super.toggleFavorite(id);
    const has = (await this.getFavorites()).includes(id);
    return this.api(`api/me/favorites/${id}`, { method: has ? "DELETE" : "PUT", body: {} });
  }
  async clearAll() {
    if (await this.me()) await this.logout().catch(() => {});
    this.storage.removeItem(`${P}myorders`);
    return super.clearAll();
  }
}

// De Pages-build zet <meta name="dezon-mode" content="demo"> in index.html: een statische host heeft geen server om te vragen.
export function staticDemo(doc = globalThis.document) {
  return doc?.querySelector?.('meta[name="dezon-mode"][content="demo"]') != null;
}

// Kiest de bron: de echte server als die antwoordt op /api/health, anders de demo.
export async function probeServer(fetchImpl = globalThis.fetch, base) {
  if (staticDemo()) return null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    const res = await fetchImpl(new URL("api/health", base || globalThis.location?.href), { signal: ctl.signal, credentials: "same-origin", cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok === true && data.mode === "live" ? data : null;
  } catch { return null; }
}
