import { html, $ } from "../../lib/dom.js";
import { confirmSheet } from "../../components/confirm.js";

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "categorie";
const ILL = ["frites", "hamburger", "snack", "blad", "ijs", "beker", "saus"];

export default {
  render(app) {
    const { menu } = app.data;
    const photos = Object.keys(app.fotos || {});
    return html`
      <p class="small muted">Categorieën bepalen de volgorde en de foto bovenaan op de menukaart. Een categorie met producten kun je niet verwijderen.</p>
      <details class="adm"><summary><strong>Nieuwe categorie</strong></summary>
        <form class="stack" id="c-new" novalidate>
          <div class="field"><label for="c-naam">Naam</label><input id="c-naam" name="naam" type="text" maxlength="40"></div>
          <p class="field-error" id="c-err" role="alert"></p>
          <button class="btn" type="submit">Categorie toevoegen</button>
        </form></details>
      <ul class="stack" id="clist">${menu.categorieen.map((c, i) => html`
        <li class="card stack" data-cid="${c.id}">
          <div class="field"><label>Naam<input name="naam" type="text" maxlength="40" value="${c.naam}"></label></div>
          <div class="two">
            <div class="field"><label>Foto (voorbeeld)<select name="foto"><option value="">Geen</option>${photos.map((f) => html`<option value="${f}" ${f === c.foto ? "selected" : ""}>${f}</option>`)}</select></label></div>
            <div class="field"><label>Tekening<select name="illustratie">${ILL.map((f) => html`<option value="${f}" ${f === c.illustratie ? "selected" : ""}>${f}</option>`)}</select></label></div>
          </div>
          <p class="small muted">${menu.producten.filter((p) => p.categorie === c.id).length} producten</p>
          <div class="status-btns">
            <button class="btn secondary sm" data-up ${i === 0 ? "disabled" : ""} aria-label="${c.naam} omhoog">Omhoog</button>
            <button class="btn secondary sm" data-down ${i === menu.categorieen.length - 1 ? "disabled" : ""} aria-label="${c.naam} omlaag">Omlaag</button>
            <button class="btn sm" data-save>Opslaan</button>
            <button class="btn danger sm" data-del>Verwijderen</button>
          </div>
        </li>`)}</ul>`;
  },
  mount(root, app) {
    const save = async (menu, msg) => { try { await app.ds.saveMenu(menu); await app.refreshData(); app.toast(msg); app.rerender({ keepScroll: true }); } catch (e) { app.toast(e.message, "error"); } };
    $("#c-new", root).addEventListener("submit", async (e) => {
      e.preventDefault();
      const naam = e.target.naam.value.trim();
      if (!naam) return void ($("#c-err", root).textContent = "Geef de categorie een naam.");
      const menu = structuredClone(app.data.menu);
      let id = slug(naam); while (menu.categorieen.some((c) => c.id === id)) id += "-2";
      menu.categorieen.push({ id, naam, illustratie: "frites", foto: "" });
      await save(menu, "Categorie toegevoegd");
    });
    root.addEventListener("click", async (e) => {
      const li = e.target.closest("[data-cid]");
      if (!li) return;
      const menu = structuredClone(app.data.menu), i = menu.categorieen.findIndex((c) => c.id === li.dataset.cid), c = menu.categorieen[i];
      if (e.target.closest("[data-up]") || e.target.closest("[data-down]")) {
        const j = i + (e.target.closest("[data-up]") ? -1 : 1);
        [menu.categorieen[i], menu.categorieen[j]] = [menu.categorieen[j], menu.categorieen[i]];
        return save(menu, "Volgorde aangepast");
      }
      if (e.target.closest("[data-save]")) {
        const naam = li.querySelector("[name=naam]").value.trim();
        if (!naam) return app.toast("Een categorie heeft een naam nodig.", "error");
        Object.assign(c, { naam, foto: li.querySelector("[name=foto]").value, illustratie: li.querySelector("[name=illustratie]").value });
        return save(menu, "Opgeslagen");
      }
      if (e.target.closest("[data-del]")) {
        if (menu.producten.some((p) => p.categorie === c.id)) return app.toast("Verplaats of verwijder eerst de producten in deze categorie.", "error");
        if (!(await confirmSheet(app, { title: `${c.naam} verwijderen?`, text: "De categorie verdwijnt van de menukaart.", yes: "Verwijderen" }))) return;
        menu.categorieen.splice(i, 1);
        save(menu, "Verwijderd");
      }
    });
  },
};
