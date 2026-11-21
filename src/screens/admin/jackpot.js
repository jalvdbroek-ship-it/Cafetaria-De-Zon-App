import { html, $, $$ } from "../../lib/dom.js";
import { parseEuroInput } from "../../lib/money.mjs";
import { jackpotProblem, odds } from "../../lib/jackpot.mjs";

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "prijs";
const euro = (c) => (c / 100).toFixed(2).replace(".", ",");
const row = (p = { id: "", naam: "", weight: 10 }) => html`<div class="reward-edit" data-id="${p.id}"><input aria-label="Naam prijs" name="pnaam" type="text" maxlength="40" value="${p.naam}"><input aria-label="Gewicht (kans)" name="pweight" type="number" min="1" max="1000" inputmode="numeric" value="${p.weight}"><button type="button" class="icon-btn" data-pdel aria-label="Verwijder ${p.naam || "prijs"}">×</button></div>`;
let vFilter = "";

export default {
  async render(app) {
    const j = await app.ds.adminJackpot();
    const vouchers = await app.ds.adminVouchers();
    app.jpAdmin = j;
    const shown = vouchers.filter((v) => !vFilter || v.code.includes(vFilter.toUpperCase().trim()));
    return html`
      <p class="demo-banner" role="note"><span><strong>Eerst de regels controleren</strong>Een rad met prijzen bij een bestelling kan onder de Nederlandse kansspelregels vallen. Laat de spelregels toetsen voordat je de Jackpot voor echte klanten aanzet (zie docs/HOSTEN.md). Op de server staat hij standaard uit.</span></p>
      <form id="jp" class="stack" novalidate>
        <label class="check"><input type="checkbox" name="enabled" ${j.enabled ? "checked" : ""}><span class="grow">Jackpot staat aan</span></label>
        <div class="two">
          <div class="field"><label for="jp-min">Minimum bestelling (euro)</label><input id="jp-min" name="min" type="text" inputmode="decimal" value="${euro(j.minTotal)}"></div>
          <div class="field"><label for="jp-dagen">Bon geldig (dagen)</label><input id="jp-dagen" name="dagen" type="number" min="1" max="365" value="${j.geldigDagen}"></div>
        </div>
        <label class="check"><input type="checkbox" name="voorbeeld" ${j.voorbeeld !== false ? "checked" : ""}><span class="grow">Toon als voorbeeldprijzen</span></label>
        <h2 class="h3">Prijzen en kansen</h2>
        <p class="small muted">Elke draai wint een prijs. Hoe hoger het gewicht, hoe groter de kans. Prijzen zijn bonnen voor producten, geen geld.</p>
        <div id="prizes" class="stack">${j.prizes.map(row)}</div>
        <button type="button" class="btn secondary sm" id="padd">Prijs toevoegen</button>
        <ul class="odds" id="odds" aria-live="polite"></ul>
        <p class="field-error" id="jp-err" role="alert"></p>
        <button class="btn" type="submit">Opslaan</button>
      </form>
      <section class="stack" aria-labelledby="bonnen"><h2 id="bonnen">Bonnen</h2>
        <div class="field"><label for="vf">Zoek een code</label><input id="vf" type="search" value="${vFilter}" placeholder="JKP- of BON-" autocomplete="off"></div>
        ${shown.length ? html`<ul class="stack">${shown.slice(0, 30).map((v) => html`<li class="card spread" data-code="${v.code}"><span><strong class="num">${v.code}</strong><span class="small muted block">${v.naam} · ${v.type === "jackpot" ? "Jackpot" : "Spaarbeloning"} · ${v.status}</span></span>${v.status === "open" ? html`<button class="btn sm" data-use>Verzilver</button>` : ""}</li>`)}</ul>` : html`<p class="muted">Geen bonnen gevonden.</p>`}</section>`;
  },
  mount(root, app) {
    const box = $("#prizes", root), form = $("#jp", root);
    const read = () => $$(".reward-edit", box).map((r) => ({ id: r.dataset.id || "", naam: r.querySelector("[name=pnaam]").value.trim(), weight: Number(r.querySelector("[name=pweight]").value) }));
    const preview = () => {
      const ps = read().filter((p) => p.naam && Number.isInteger(p.weight) && p.weight > 0);
      $("#odds", root).innerHTML = odds(ps).map((p) => `<li><span class="grow">${p.naam.replace(/[<>&"]/g, "")}</span><span class="num">${p.percent.toLocaleString("nl-NL")}%</span></li>`).join("");
    };
    preview();
    $("#padd", root).addEventListener("click", () => { box.insertAdjacentHTML("beforeend", row().s); box.lastElementChild.querySelector("input").focus(); preview(); });
    box.addEventListener("input", preview);
    box.addEventListener("click", (e) => { e.target.closest("[data-pdel]")?.closest(".reward-edit").remove(); preview(); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("#jp-err", root), min = parseEuroInput(form.min.value);
      const used = new Set(), prizes = read();
      for (const p of prizes) { p.id = p.id || slug(p.naam); while (used.has(p.id)) p.id += "-2"; used.add(p.id); }
      const jackpot = { enabled: form.enabled.checked, voorbeeld: form.voorbeeld.checked, minTotal: min ?? -1, geldigDagen: Number(form.dagen.value), prizes };
      const problem = jackpotProblem(jackpot);
      if (problem) return void (err.textContent = problem);
      try { await app.ds.saveConfig({ jackpot }); await app.refreshData(); app.toast("Jackpot opgeslagen"); app.rerender({ focus: "h1" }); }
      catch (x) { err.textContent = x.message; }
    });
    let timer;
    $("#vf", root).addEventListener("input", (e) => { vFilter = e.target.value; clearTimeout(timer); timer = setTimeout(() => app.rerender({ keepScroll: true, focus: "#vf" }), 300); });
    root.addEventListener("click", async (e) => {
      if (!e.target.closest("[data-use]")) return;
      try { await app.ds.adminRedeemVoucher(e.target.closest("[data-code]").dataset.code); app.toast("Bon verzilverd"); app.rerender({ keepScroll: true }); }
      catch (x) { app.toast(x.message, "error"); }
    });
    return () => clearTimeout(timer);
  },
};
