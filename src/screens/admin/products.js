import { html, $ } from "../../lib/dom.js";
import { formatEuro, parseEuroInput } from "../../lib/money.mjs";
import { confirmSheet } from "../../components/confirm.js";
import { icon } from "../../components/icons.js";
import { productImage } from "../../components/product.js";

const open = new Set();
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
const euro = (c) => (c / 100).toFixed(2).replace(".", ",");

const photoField = (app, p) => {
  const img = productImage(app, p);
  return html`<div class="photo-up"><span class="prod-img">${img ? html`<img src="${img.src}" alt="" style="object-position:${img.pos}">` : ""}</span>
    <div class="stack"><input type="hidden" name="foto" value="${p.foto || ""}">
      ${app.ds.caps.upload ? html`<label class="btn secondary sm">${icon("camera")} Foto kiezen<input class="sr" type="file" accept="image/webp,image/jpeg,image/png" data-upload></label>
        ${p.foto ? html`<button type="button" class="link" data-nofoto>Eigen foto verwijderen</button>` : ""}
        <p class="small muted">${p.foto ? "Eigen foto." : "Nu staat er een voorbeeldfoto."} Webp, jpg of png, maximaal 2 MB.</p>`
        : html`<p class="small muted">Foto's uploaden werkt alleen met de echte server (zie docs/HOSTEN.md).</p>`}</div></div>`;
};

export default {
  render(app) {
    const { menu } = app.data;
    return html`
      <p class="small muted">${app.demo ? "Prijzen en namen zijn voorbeelden. " : ""}Zet "bevestigd" aan als De Zon de prijs heeft goedgekeurd; dan verdwijnt het voorbeeldlabel.</p>
      <details class="adm" id="new"><summary><strong>Nieuw product</strong></summary>
        <form class="stack" id="new-form" novalidate>
          <div class="field"><label for="n-naam">Naam</label><input id="n-naam" name="naam" type="text" maxlength="60"></div>
          <div class="field"><label for="n-cat">Categorie</label><select id="n-cat" name="categorie">${menu.categorieen.map((c) => html`<option value="${c.id}">${c.naam}</option>`)}</select></div>
          <div class="field"><label for="n-prijs">Prijs in euro</label><input id="n-prijs" name="prijs" type="text" inputmode="decimal" placeholder="3,50"></div>
          <p class="field-error" id="n-err" role="alert"></p>
          <button class="btn" type="submit">Product toevoegen</button>
        </form></details>
      ${menu.categorieen.map((c) => html`<section class="stack"><h2 class="h3">${c.naam}</h2>${menu.producten.filter((p) => p.categorie === c.id).map((p) => html`
        <div class="stack">
        <label class="check"><input type="checkbox" data-soldout="${p.id}" ${p.uitverkocht ? "checked" : ""}><span class="grow">${p.naam} <span class="muted num">${formatEuro(p.prijs)}</span></span><span class="small">Uitverkocht</span></label>
        <details class="adm" data-id="${p.id}" ${open.has(p.id) ? "open" : ""}>
          <summary><span class="grow">Wijzig ${p.naam}</span>${p.uitverkocht ? html`<span class="pill uit">Uit</span>` : ""}</summary>
          <div class="stack">
            <div class="field"><label>Naam<input name="naam" type="text" maxlength="60" value="${p.naam}"></label></div>
            <div class="field"><label>Omschrijving<input name="omschrijving" type="text" maxlength="100" value="${p.omschrijving || ""}"></label></div>
            <div class="two"><div class="field"><label>Prijs in euro<input name="prijs" type="text" inputmode="decimal" value="${euro(p.prijs)}"></label></div>
            <div class="field"><label>Categorie<select name="categorie">${menu.categorieen.map((k) => html`<option value="${k.id}" ${k.id === p.categorie ? "selected" : ""}>${k.naam}</option>`)}</select></label></div></div>
            ${photoField(app, p)}
            <label class="check"><input type="checkbox" name="uitverkocht" ${p.uitverkocht ? "checked" : ""}><span class="grow">Uitverkocht</span></label>
            <label class="check"><input type="checkbox" name="uitgelicht" ${p.uitgelicht ? "checked" : ""}><span class="grow">Populair op Home</span></label>
            <label class="check"><input type="checkbox" name="bevestigd" ${p.bevestigd ? "checked" : ""}><span class="grow">Prijs bevestigd door De Zon</span></label>
            <p class="field-error" data-err role="alert"></p>
            <div class="two"><button class="btn" data-save>Opslaan</button><button class="btn danger" data-del>Verwijderen</button></div>
          </div></details></div>`)}</section>`)}`;
  },
  mount(root, app) {
    const save = async (menu, msg, focus) => {
      try { await app.ds.saveMenu(menu); await app.refreshData(); app.toast(msg); app.rerender({ focus, keepScroll: true }); }
      catch (e) { app.toast(e.message, "error"); }
    };
    root.addEventListener("toggle", (e) => { const id = e.target.dataset?.id; if (id) (e.target.open ? open.add(id) : open.delete(id)); }, true);
    $("#new-form", root).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, naam = f.naam.value.trim(), prijs = parseEuroInput(f.prijs.value);
      if (!naam || prijs == null) { $("#n-err", root).textContent = "Vul een naam en een prijs in (bijvoorbeeld 3,50)."; return; }
      const menu = structuredClone(app.data.menu);
      let id = slug(naam); while (menu.producten.some((p) => p.id === id)) id += "-2";
      menu.producten.push({ id, categorie: f.categorie.value, naam, omschrijving: "", prijs, opties: [], uitverkocht: false, uitgelicht: false, bevestigd: false });
      open.add(id);
      await save(menu, "Product toegevoegd", `[data-id="${id}"] summary`);
    });
    root.addEventListener("change", async (e) => {
      const sold = e.target.closest("[data-soldout]"), up = e.target.closest("[data-upload]");
      if (sold) {
        const menu = structuredClone(app.data.menu), p = menu.producten.find((x) => x.id === sold.dataset.soldout);
        p.uitverkocht = sold.checked;
        await save(menu, sold.checked ? `${p.naam} is uitverkocht` : `${p.naam} is weer beschikbaar`);
      }
      if (up && up.files[0]) {
        const d = up.closest("details.adm");
        try { const url = await app.ds.uploadPhoto(up.files[0]); d.querySelector("[name=foto]").value = url; d.querySelector(".prod-img").innerHTML = `<img src="${url}" alt="">`; app.toast("Foto geüpload. Kies Opslaan om hem te gebruiken."); }
        catch (err) { d.querySelector("[data-err]").textContent = err.message; }
      }
    });
    root.addEventListener("click", async (e) => {
      const d = e.target.closest("details.adm[data-id]"), id = d?.dataset.id;
      if (!id) return;
      const menu = structuredClone(app.data.menu), i = menu.producten.findIndex((p) => p.id === id);
      if (e.target.closest("[data-nofoto]")) { d.querySelector("[name=foto]").value = ""; d.querySelector(".prod-img").innerHTML = ""; return; }
      if (e.target.closest("[data-save]")) {
        const g = (n) => d.querySelector(`[name="${n}"]`);
        const prijs = parseEuroInput(g("prijs").value), naam = g("naam").value.trim();
        if (!naam || prijs == null) { d.querySelector("[data-err]").textContent = "Vul een naam en een geldige prijs in (bijvoorbeeld 3,50)."; return; }
        Object.assign(menu.producten[i], { naam, omschrijving: g("omschrijving").value.trim(), prijs, categorie: g("categorie").value, foto: g("foto").value || null, uitverkocht: g("uitverkocht").checked, uitgelicht: g("uitgelicht").checked, bevestigd: g("bevestigd").checked });
        await save(menu, "Opgeslagen", `[data-id="${id}"] summary`);
      }
      if (e.target.closest("[data-del]")) {
        if (!(await confirmSheet(app, { title: `${menu.producten[i].naam} verwijderen?`, text: app.demo ? "Het product verdwijnt uit het menu (alleen op dit toestel)." : "Het product verdwijnt uit het menu voor alle klanten.", yes: "Verwijderen" }))) return;
        menu.producten.splice(i, 1); open.delete(id);
        await save(menu, "Verwijderd", "h1");
      }
    });
  },
};
