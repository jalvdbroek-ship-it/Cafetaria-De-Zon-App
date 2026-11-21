import { randomBytes, createHash } from "node:crypto";
import { HttpError } from "./http.mjs";
import { createSessions, createLimiter, parseCookies, sessionCookie, safeEqual } from "./auth.mjs";

export const CUSTOMER_COOKIE = "dezon_sid";
export const ADMIN_COOKIE = "dezon_admin";
export const CUSTOMER_TTL = 30 * 86400000;
export const ADMIN_TTL = 8 * 3600000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class Reply { constructor(status, body, headers = {}) { this.status = status; this.body = body; this.headers = headers; } }
export const sha = (s) => createHash("sha256").update(String(s)).digest("hex");

export function createContext({ store, adminPassword = "", uploadDir, now = () => new Date(), trustProxy = false, forceSecure = false, siteBase }) {
  const sessions = createSessions(store, { now: () => now().getTime() });
  const limiters = {
    login: createLimiter({ max: 8, windowMs: 15 * 60000, now: () => now().getTime() }),
    loginIp: createLimiter({ max: 30, windowMs: 15 * 60000, now: () => now().getTime() }),
    admin: createLimiter({ max: 5, windowMs: 15 * 60000, now: () => now().getTime() }),
    register: createLimiter({ max: 10, windowMs: 60 * 60000, now: () => now().getTime() }),
    order: createLimiter({ max: 12, windowMs: 10 * 60000, now: () => now().getTime() }),
    spin: createLimiter({ max: 30, windowMs: 10 * 60000, now: () => now().getTime() }),
  };
  const ctx = {
    store, sessions, limiters, uploadDir, now, siteBase,
    adminEnabled: typeof adminPassword === "string" && adminPassword.length >= 10,
    checkAdminPassword: (given) => ctx.adminEnabled && typeof given === "string" && safeEqual(given, adminPassword),
    ip(req) {
      const fwd = trustProxy ? String(req.headers["x-forwarded-for"] || "").split(",").pop().trim() : "";
      return fwd || req.socket.remoteAddress || "?";
    },
    secure: (req) => forceSecure || Boolean(req.socket.encrypted) || (trustProxy && req.headers["x-forwarded-proto"] === "https"),
    cookie(req, name, token, ttl) { return sessionCookie(name, token, { secure: ctx.secure(req), maxAgeSec: Math.floor(ttl / 1000) }); },
    session(req, name, role) {
      const s = sessions.get(parseCookies(req.headers.cookie)[name]);
      return s && s.role === role ? s : null;
    },
    token: (req, name) => parseCookies(req.headers.cookie)[name],
    requireAdmin(req) {
      if (!ctx.session(req, ADMIN_COOKIE, "admin")) throw new HttpError(401, "Log eerst in als beheerder.");
    },
    customer(req) {
      const s = ctx.session(req, CUSTOMER_COOKIE, "customer");
      return s ? store.read("customers", []).find((c) => c.id === s.customerId) || null : null;
    },
    requireCustomer(req) {
      const c = ctx.customer(req);
      if (!c) throw new HttpError(401, "Log eerst in.");
      return c;
    },
    limit(limiter, key) {
      const r = limiter.check(key);
      if (!r.allowed) throw new HttpError(429, `Te veel pogingen. Probeer het over ${Math.ceil(r.retryAfterSec / 60)} minuut of minuten opnieuw.`);
    },
    code(prefix, n = 5) { const b = randomBytes(n); return `${prefix}-${[...b].map((x) => CODE_CHARS[x % CODE_CHARS.length]).join("")}`; },
    view(o) {
      const { tokenHash, customerId, ...rest } = o;
      const spin = store.read("spins", {})[o.id];
      const v = spin && store.read("vouchers", []).find((x) => x.code === spin.code);
      return { ...rest, spin: spin ? { ...spin, status: v?.status || spin.status } : null };
    },
  };
  return ctx;
}
