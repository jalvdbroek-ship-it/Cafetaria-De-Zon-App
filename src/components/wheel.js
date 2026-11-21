import { raw, esc } from "../lib/dom.js";

const FILLS = ["var(--sun)", "var(--paper-2)", "var(--amber)", "var(--paper)"];
const pt = (r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; };

// Regelafbreking in maximaal drie korte regels, zodat de naam in een taartpunt past.
function lines(text, max = 11) {
  const out = [];
  for (const w of text.split(/\s+/)) {
    if (out.length && (out.at(-1) + " " + w).length <= max) out[out.length - 1] += " " + w;
    else out.push(w);
  }
  return out.slice(0, 3).map((l) => (l.length > max + 2 ? `${l.slice(0, max)}…` : l));
}

// Gelijke taartpunten: de kans per prijs staat in de lijst eronder, niet in de grootte van de punt.
export function wheelSvg(prizes) {
  const n = prizes.length, a = 360 / n;
  const segs = prizes.map((p, i) => {
    const [x1, y1] = pt(96, i * a), [x2, y2] = pt(96, (i + 1) * a);
    const mid = (i + 0.5) * a, [tx, ty] = pt(60, mid);
    const rot = mid > 180 ? mid + 90 : mid - 90;
    const ls = lines(p.naam);
    const text = ls.map((l, k) => `<tspan x="${tx.toFixed(1)}" dy="${k === 0 ? `${-(ls.length - 1) * 4.2}` : "8.4"}">${esc(l)}</tspan>`).join("");
    const path = n === 1 ? `<circle cx="100" cy="100" r="96" fill="${FILLS[0]}" stroke="var(--ink)" stroke-width="2"/>` : `<path d="M100 100 L${x1.toFixed(2)} ${y1.toFixed(2)} A96 96 0 ${a > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${FILLS[i % FILLS.length]}" stroke="var(--ink)" stroke-width="2"/>`;
    return `${path}<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${rot.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="middle" font-size="7" font-weight="800" fill="var(--ink)">${text}</text>`;
  }).join("");
  return raw(`<div class="wheel-wrap"><svg class="wheel-pointer" viewBox="0 0 20 24" width="30" height="36" aria-hidden="true"><path d="M10 24 1 4a10 10 0 0 1 18 0Z" fill="var(--ember)" stroke="var(--ink)" stroke-width="2"/></svg>
    <svg class="wheel" id="wheel" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><g>${segs}</g><circle cx="100" cy="100" r="10" fill="var(--ink)"/></svg></div>`);
}

// Draaihoek (graden) waarbij taartpunt index onder de wijzer komt, na een paar extra omwentelingen.
export const targetRotation = (index, count, { turns = 5, jitter = 0 } = {}) => {
  const a = 360 / count;
  return turns * 360 - (index + 0.5) * a + jitter * a * 0.35;
};
