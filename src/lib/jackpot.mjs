// Jackpot-rad: gewogen trekking, voorwaarden en een draai per bestelling. Puur en zonder opslag;
// de server (of de demo-bron) bewaart de uitslag. Elke draai levert een bon op (geen geld, geen uitbetaling).
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Willekeurig geheel getal in [0, max) met crypto en zonder modulo-scheefheid.
export function cryptoInt(max) {
  if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError("max moet een geheel getal van 1 tot 2^32 zijn");
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

export const voucherCode = (prefix, randomInt = cryptoInt, n = 5) => `${prefix}-${Array.from({ length: n }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("")}`;

export function jackpotProblem(j) {
  if (!j || typeof j !== "object") return "De Jackpot-instellingen ontbreken.";
  if (!Number.isInteger(j.minTotal) || j.minTotal < 0 || j.minTotal > 100000) return "Minimumbedrag: hele centen van 0 tot 1000 euro.";
  if (!Number.isInteger(j.geldigDagen) || j.geldigDagen < 1 || j.geldigDagen > 365) return "Een bon is 1 tot 365 dagen geldig.";
  if (!Array.isArray(j.prizes) || j.prizes.length < 1 || j.prizes.length > 12) return "Zet 1 tot 12 prijzen in het rad.";
  const ids = new Set();
  for (const p of j.prizes) {
    if (!p || typeof p.id !== "string" || !/^[a-z0-9-]{1,30}$/.test(p.id)) return "Een prijs heeft een ongeldige code.";
    if (ids.has(p.id)) return `Prijs "${p.id}" komt twee keer voor.`;
    ids.add(p.id);
    if (typeof p.naam !== "string" || !p.naam.trim() || p.naam.length > 40) return "Elke prijs heeft een naam van maximaal 40 tekens.";
    if (!Number.isInteger(p.weight) || p.weight < 1 || p.weight > 1000) return `Kans van "${p.naam}": een geheel getal van 1 tot 1000.`;
  }
  return null;
}

export const qualifies = (j, totalCents) => Boolean(j?.enabled) && Number.isInteger(totalCents) && totalCents >= (j.minTotal ?? 0);

// Kans per prijs in procenten (som 100), voor het rad en de spelregels.
export function odds(prizes) {
  const sum = prizes.reduce((s, p) => s + p.weight, 0);
  return prizes.map((p) => ({ id: p.id, naam: p.naam, percent: sum ? Math.round((p.weight / sum) * 1000) / 10 : 0 }));
}

export function drawPrize(prizes, randomInt = cryptoInt) {
  const sum = prizes.reduce((s, p) => s + p.weight, 0);
  if (!prizes.length || sum < 1) throw new Error("Er zijn geen prijzen om uit te trekken.");
  let r = randomInt(sum);
  for (const p of prizes) { if (r < p.weight) return p; r -= p.weight; }
  return prizes[prizes.length - 1];
}

// Eén draai per bestelling: bestaat er al een draai, dan krijg je dezelfde uitslag terug (nooit een tweede trekking).
export function resolveSpin(j, order, existing, { now = new Date(), randomInt = cryptoInt } = {}) {
  if (existing) return { spin: existing, isNew: false };
  if (!j?.enabled) throw new Error("De Jackpot staat nu uit.");
  if (!qualifies(j, order.total)) throw new Error("Deze bestelling komt niet in aanmerking voor een draai.");
  const prize = drawPrize(j.prizes, randomInt);
  const until = new Date(now.getTime() + j.geldigDagen * 86400000);
  return { isNew: true, spin: { orderId: order.id, prizeId: prize.id, naam: prize.naam, code: voucherCode("JKP", randomInt), at: now.toISOString(), geldigTot: until.toISOString(), status: "open" } };
}
