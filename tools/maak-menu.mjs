// Zet het voorbeeldmenu van de website (tools/bron/menu-site.json, euro's) om naar het app-model (centen, id's, optiegroepen).
// Run: node tools/maak-menu.mjs   (schrijft src/data/menu.json)
import { readFileSync, writeFileSync } from "node:fs";

const bron = JSON.parse(readFileSync(new URL("./bron/menu-site.json", import.meta.url), "utf8"));
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const optiegroepen = [
  { id: "saus", naam: "Extra saus", type: "multi", verplicht: false, max: 3, opties: [
    { id: "mayonaise", naam: "Mayonaise", prijs: 60 }, { id: "ketchup", naam: "Ketchup", prijs: 60 },
    { id: "pindasaus", naam: "Pindasaus", prijs: 70 }, { id: "currysaus", naam: "Currysaus", prijs: 60 },
    { id: "knoflooksaus", naam: "Knoflooksaus", prijs: 70 } ] },
  { id: "houder", naam: "Hoorntje of bakje", type: "single", verplicht: true, opties: [
    { id: "hoorntje", naam: "Hoorntje", prijs: 0 }, { id: "bakje", naam: "Bakje", prijs: 0 } ] },
  { id: "weglaten", naam: "Weglaten", type: "multi", verplicht: false, max: 3, opties: [
    { id: "zonder-sla", naam: "Zonder sla", prijs: 0 }, { id: "zonder-tomaat", naam: "Zonder tomaat", prijs: 0 },
    { id: "zonder-saus", naam: "Zonder saus", prijs: 0 } ] },
  { id: "smaak", naam: "Smaak", type: "single", verplicht: true, opties: [
    { id: "vanille", naam: "Vanille", prijs: 0 }, { id: "aardbei", naam: "Aardbei", prijs: 0 }, { id: "chocolade", naam: "Chocolade", prijs: 0 } ] },
];
const opties = { frites: ["saus"], hamburgers: ["weglaten", "saus"], snacks: ["saus"], vegetarisch: ["saus"] };
const perProduct = { softijs: ["houder"], "bolletje-ijs": ["houder"], kinderijsje: ["houder"], milkshake: ["smaak"], ijscoupe: [] };
const uitgelicht = new Set(["frites-middel", "frites-speciaal", "frikandel", "kroket", "hamburger", "softijs"]);
const noSauce = new Set(["frites-speciaal", "frites-oorlog"]); // saus zit al in de omschrijving

const menu = {
  _uitleg: "VOORBEELDMENU. Alle producten hebben bevestigd:false (ook de prijzen, in centen). Zet bevestigd op true en vul de echte prijs in zodra de eigenaar het goedkeurt, of pas het aan in het demo-beheerpaneel (#/beheer).",
  categorieen: bron.categorieen.map((c) => ({ id: c.id, naam: c.naam, illustratie: c.illustratie, foto: c.id })),
  optiegroepen,
  producten: bron.categorieen.flatMap((c) => c.items.map((i) => {
    const id = slug(i.naam);
    return {
      id, categorie: c.id, naam: i.naam, omschrijving: i.omschrijving || "", prijs: Math.round(i.prijs * 100),
      opties: id in perProduct ? perProduct[id] : noSauce.has(id) ? [] : opties[c.id] || [],
      uitverkocht: false, uitgelicht: uitgelicht.has(id), bevestigd: false,
    };
  })),
};
writeFileSync(new URL("../src/data/menu.json", import.meta.url), JSON.stringify(menu, null, 2) + "\n");
console.log(`${menu.producten.length} producten, ${menu.optiegroepen.length} optiegroepen`);
