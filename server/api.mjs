import { HttpError, send } from "./http.mjs";
import { Reply } from "./context.mjs";
import { shopRoutes } from "./routes-shop.mjs";
import { meRoutes } from "./routes-me.mjs";
import { adminRoutes } from "./routes-admin.mjs";

// Wijzigende verzoeken moeten van de eigen pagina komen: eigen header (dwingt een CORS-preflight af) en een kloppende Origin.
function sameOrigin(req) {
  if (req.headers["x-dezon"] !== "1") return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

export function createApi(ctx, { log = console.error } = {}) {
  const routes = [...shopRoutes(ctx), ...meRoutes(ctx), ...adminRoutes(ctx)];
  return async function handleApi(req, res, url) {
    const base = { "Cache-Control": "no-store" };
    try {
      const hits = routes.map(([method, re, fn]) => [method, re.exec(url.pathname), fn]).filter(([, m]) => m);
      if (!hits.length) throw new HttpError(404, "Onbekend adres.");
      const method = req.method === "HEAD" ? "GET" : req.method;
      const hit = hits.find(([m]) => m === method);
      if (!hit) { send(res, 405, { error: "Deze methode kan hier niet." }, { ...base, Allow: hits.map((h) => h[0]).join(", ") }); return; }
      if (method !== "GET" && !sameOrigin(req)) throw new HttpError(403, "Dit verzoek komt niet van de app.");
      const out = await hit[2](req, res, hit[1], url.searchParams);
      if (out instanceof Reply) send(res, out.status, out.body, { ...base, ...out.headers });
      else send(res, 200, out, base);
    } catch (e) {
      if (e instanceof HttpError) send(res, e.status, { error: e.message, ...(e.fields ? { fields: e.fields } : {}) }, base);
      else { log("API-fout:", e); send(res, 500, { error: "Er ging iets mis op de server. Probeer het later opnieuw." }, base); }
    }
  };
}
