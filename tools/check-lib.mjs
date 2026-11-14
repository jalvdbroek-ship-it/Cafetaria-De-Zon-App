// Draait in de pagina (page.evaluate): eenvoudige toegankelijkheids- en maatcontrole. Geeft een lijst problemen terug.
export function auditPage() {
  const out = [];
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[inert],[hidden]"); };
  const name = (el) => {
    const lb = el.getAttribute("aria-labelledby");
    if (lb) return lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
    const al = el.getAttribute("aria-label"); if (al) return al.trim();
    if (el.labels?.length) return [...el.labels].map((l) => l.textContent).join(" ").trim();
    return (el.textContent || el.getAttribute("title") || el.getAttribute("placeholder") || "").trim();
  };
  const loc = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""}`;
  if (document.documentElement.lang !== "nl") out.push("html mist lang=nl");
  if (document.querySelectorAll("main").length !== 1) out.push("verwacht precies één main");
  if (document.querySelectorAll("h1").length !== 1) out.push(`verwacht één h1, gevonden ${document.querySelectorAll("h1").length}`);
  let last = 0;
  for (const h of document.querySelectorAll("#view h1,#view h2,#view h3,#sheet h2")) {
    if (!visible(h)) continue;
    const l = Number(h.tagName[1]);
    if (last && l > last + 1) out.push(`kopniveau-sprong naar ${h.tagName} bij "${h.textContent.trim().slice(0, 30)}"`);
    last = l;
  }
  const ids = new Map();
  for (const el of document.querySelectorAll("[id]")) ids.set(el.id, (ids.get(el.id) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) out.push(`dubbele id "${id}"`);
  for (const img of document.querySelectorAll("img")) if (!img.hasAttribute("alt")) out.push(`img zonder alt: ${img.getAttribute("src")}`);
  for (const el of document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,summary")) {
    if (!visible(el)) continue;
    if (!name(el)) out.push(`geen toegankelijke naam: ${loc(el)}`);
    if (el.matches("a.skip")) continue;
    const r = el.getBoundingClientRect();
    const box = el.matches(".slot input") ? el.closest(".slot").getBoundingClientRect() : el.matches("input[type=checkbox],input[type=radio]") ? el.closest("label").getBoundingClientRect() : r;
    if (box.height < 43.5 || box.width < 43.5) out.push(`raakvlak te klein (${Math.round(box.width)}x${Math.round(box.height)}): ${loc(el)} "${name(el).slice(0, 25)}"`);
  }
  for (const el of document.querySelectorAll("[aria-labelledby],[aria-describedby]")) {
    for (const id of (el.getAttribute("aria-labelledby") || el.getAttribute("aria-describedby")).split(/\s+/)) if (!document.getElementById(id)) out.push(`aria verwijst naar onbekende id "${id}"`);
  }
  if (document.documentElement.scrollWidth > innerWidth) out.push(`horizontaal scrollen: ${document.documentElement.scrollWidth} > ${innerWidth}`);
  return out;
}
