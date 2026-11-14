export const SITE_HOURS = {
  0: ["12:30", "21:00"], 1: null, 2: ["12:30", "22:00"], 3: ["12:30", "22:00"],
  4: ["12:30", "22:00"], 5: ["12:30", "23:00"], 6: ["12:30", "23:00"],
};
export const NIGHT_HOURS = { ...SITE_HOURS, 5: ["18:00", "01:00"] };

export const MENU = {
  categorieen: [{ id: "frites", naam: "Frites" }, { id: "ijs", naam: "IJs" }],
  optiegroepen: [
    { id: "saus", naam: "Saus", type: "multi", verplicht: false, max: 2, opties: [
      { id: "mayo", naam: "Mayonaise", prijs: 60 }, { id: "pinda", naam: "Pindasaus", prijs: 70 }, { id: "curry", naam: "Curry", prijs: 60 } ] },
    { id: "houder", naam: "Hoorntje of bakje", type: "single", verplicht: true, opties: [
      { id: "hoorn", naam: "Hoorntje", prijs: 0 }, { id: "bakje", naam: "Bakje", prijs: 0 } ] },
  ],
  producten: [
    { id: "frites-middel", categorie: "frites", naam: "Frites middel", prijs: 340, opties: ["saus"] },
    { id: "frites-klein", categorie: "frites", naam: "Frites klein", prijs: 280, opties: [] },
    { id: "softijs", categorie: "ijs", naam: "Softijs", prijs: 250, opties: ["houder"] },
    { id: "op", categorie: "frites", naam: "Uitverkocht ding", prijs: 100, uitverkocht: true, opties: [] },
  ],
};

export const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
};
