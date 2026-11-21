// Vaste, per product wisselende uitsnede van een categoriefoto. Zonder tekenbit-shift: de hash blijft positief.
export function photoCrop(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { pos: `${20 + (h % 61)}% ${20 + ((h >>> 5) % 61)}%`, zoom: 1.15 + ((h >>> 9) % 5) / 10 };
}
