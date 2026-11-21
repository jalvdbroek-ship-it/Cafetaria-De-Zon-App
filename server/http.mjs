export class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
export const bad = (message, fields) => new HttpError(422, message, fields);

export function send(res, status, body, headers = {}) {
  const isJson = body !== undefined && typeof body !== "string" && !Buffer.isBuffer(body);
  const out = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, { ...(isJson ? { "Content-Type": "application/json; charset=utf-8" } : {}), ...headers });
  res.end(out);
}

// Leest de body tot een maximum; breekt af (413) zodra het te groot wordt, zonder alles in het geheugen te laden.
export function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"]);
    if (declared > limit) { req.resume(); return reject(new HttpError(413, "Het bestand of bericht is te groot.")); }
    const chunks = [];
    let size = 0, done = false;
    req.on("data", (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) { done = true; req.resume(); reject(new HttpError(413, "Het bestand of bericht is te groot.")); return; }
      chunks.push(c);
    });
    req.on("end", () => { if (!done) resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

export async function readJson(req, limit = 32 * 1024) {
  if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) throw new HttpError(415, "Stuur JSON (Content-Type: application/json).");
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  try {
    const v = JSON.parse(buf.toString("utf8"));
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error();
    return v;
  } catch { throw new HttpError(400, "Dit is geen geldig JSON-bericht."); }
}

export const str = (v, max, name = "tekst") => {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string" || v.length > max) throw bad(`Ongeldige ${name}.`);
  return v.trim();
};
