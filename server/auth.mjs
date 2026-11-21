// Wachtwoorden (scrypt), sessies (cookie, alleen de hash staat op schijf), inlogbeperking en cookie-hulpjes.
import { scrypt, randomBytes, createHash, timingSafeEqual } from "node:crypto";

const run = (pw, salt, n) => new Promise((res, rej) => scrypt(pw, salt, 32, { N: n, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))));
const N = 16384;
const sha = (s) => createHash("sha256").update(String(s)).digest();

export const passwordProblem = (pw) => (typeof pw !== "string" || pw.length < 8 ? "Gebruik minimaal 8 tekens." : pw.length > 200 ? "Gebruik maximaal 200 tekens." : null);

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  return `scrypt$${N}$${salt.toString("hex")}$${(await run(pw, salt, N)).toString("hex")}`;
}
export async function verifyPassword(pw, stored) {
  const [kind, n, salt, hash] = String(stored || "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const got = await run(String(pw ?? ""), Buffer.from(salt, "hex"), Number(n));
  const want = Buffer.from(hash, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}
// Vergelijking in constante tijd, ook bij verschillende lengtes.
export const safeEqual = (a, b) => timingSafeEqual(sha(a), sha(b));

export function createSessions(store, { now = () => Date.now() } = {}) {
  const FILE = "sessions";
  const live = () => {
    const all = store.read(FILE, {}), t = now();
    const kept = Object.fromEntries(Object.entries(all).filter(([, s]) => s.exp > t));
    return [all, kept];
  };
  return {
    create(role, customerId, ttlMs) {
      const token = randomBytes(32).toString("base64url");
      const [, kept] = live();
      store.write(FILE, { ...kept, [sha(token).toString("hex")]: { role, customerId: customerId || null, exp: now() + ttlMs } });
      return token;
    },
    get(token) {
      if (!token || typeof token !== "string" || token.length > 100) return null;
      const s = store.read(FILE, {})[sha(token).toString("hex")];
      return s && s.exp > now() ? s : null;
    },
    destroy(token) {
      if (!token) return;
      store.update(FILE, {}, (all) => { delete all[sha(token).toString("hex")]; });
    },
    destroyCustomer(customerId) {
      store.update(FILE, {}, (all) => { for (const [k, s] of Object.entries(all)) if (s.customerId === customerId) delete all[k]; });
    },
  };
}

export const parseCookies = (header = "") => Object.fromEntries(String(header).split(";").map((p) => p.trim().split(/=(.*)/s).slice(0, 2)).filter(([k, v]) => k && v !== undefined).map(([k, v]) => [k, decodeURIComponent(v)]));
export const sessionCookie = (name, token, { secure, maxAgeSec }) => `${name}=${token ? encodeURIComponent(token) : ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? maxAgeSec : 0}${secure ? "; Secure" : ""}`;

// Telt pogingen per sleutel in een venster. Geheugen alleen: bij herstart begint het opnieuw.
export function createLimiter({ max, windowMs, now = () => Date.now() }) {
  const hits = new Map();
  const fresh = (key) => { const t = now(); const list = (hits.get(key) || []).filter((x) => x > t - windowMs); hits.set(key, list); return list; };
  return {
    check(key) { const l = fresh(key); return l.length >= max ? { allowed: false, retryAfterSec: Math.ceil((l[0] + windowMs - now()) / 1000) } : { allowed: true }; },
    hit(key) { fresh(key).push(now()); if (hits.size > 5000) for (const k of hits.keys()) if (!fresh(k).length) hits.delete(k); },
    reset(key) { hits.delete(key); },
  };
}
