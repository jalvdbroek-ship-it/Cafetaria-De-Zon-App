# De Zon-app: ontwerpnotitie

Onderwerp en publiek: mensen uit Zwartewaal en omgeving die op hun telefoon willen zien of De Zon open is, wat er te halen valt en hoe ze bestellen, sparen en bellen. De app deelt de identiteit van de website (**Zonnebrood**) maar gedraagt zich als app: onderbalk, bottom sheets, duim-zone, één hand.

Signature: **de zonnewijzer** op Home. Een zonneschijf op een stippelboog laat live (Nederlandse tijd) zien waar "de zon" staat tussen openen en sluiten; na sluiten gaat hij onder en wordt het paneel donker ("open morgen om 12:30"). Tweede herkenbaar moment: de **klantenkaart** die omdraait.

## Drie lagen, altijd zichtbaar

| Laag | Label in de app | Stijl |
| --- | --- | --- |
| Werkt echt | geen label | gewoon |
| Demo | blauwe `Demo`-pil en, bij bestellen, een volle blauwe demobanner | `--demo` (koel blauw, valt weg uit het warme palet, dus nooit te verwarren met echt) |
| Koppeling nodig | "Koppeling nodig"-kaart | gestippelde 2px lijn, `--paper-2`, uitgeschakelde knop met uitleg |
| Voorbeeldinhoud | "Voorbeeld"-label bij prijzen en foto's | kleine tekst in `--ink-2` |

## Type
Bricolage Grotesque (variabel 200 tot 800, zelf gehost, geen CDN). Koppen 800 met strakke tracking, lopende tekst 400 tot 600, `tabular-nums` voor prijzen en tijden. Basis 17px, kleinste tekst 13px (alleen labels). Geen tweede lettertype.

## Kleur (OKLCH, gemeten met `npm run contrast`, alle paren halen WCAG 2.2 AA)
`--paper` .974/.03/88, `--paper-2` .938/.059/88, `--sun` .813/.167/82, `--amber` .813/.165/75, `--ink` .24/.032/55, `--ink-2` .412/.038/59, `--ember` .533/.169/39 (tekst op paper), `--ember-bright` .644/.192/42 (alleen vlak), `--leaf`/`--leaf-deep`, `--night` .226/.008/59 en `--night-2`, `--night-ink(-2)`, `--line`, `--line-strong`, plus voor de app `--demo` .4/.14/265 en `--demo-soft` .925/.04/265. Geel is accent (actieve tab, primaire knop, kaart), geen achtergrond van het hele scherm.

## Ruimte, vorm, materiaal
Basis 4px (4/8/12/16/24/40). Gutter 20px. Knoppen en tegels 14px radius, sheets 28px bovenhoeken, chips pillvormig. **Geen schaduwen, glas of verlopen**: vlakke kleurvlakken met een 2px inktlijn waar structuur nodig is. Raakvlakken minimaal 44px (primaire knoppen 52px). `env(safe-area-inset-*)` voor onderbalk en sheets.

## Beeld
Voorbeeldfoto's (Pexels) alleen als categoriebanner met label "Voorbeeldfoto"; productregels gebruiken eigen getekende illustraties per categorie (geen foto die zich 6 keer herhaalt). Geen AI-beelden, geen emoji, geen sterren of verzonnen aantallen.

## App-patronen
- Onderbalk met 5 tabs (Home, Menu, Mandje met badge, Sparen, Account); actieve tab geel vlak + inktlijn, label altijd zichtbaar.
- Sticky categorie-chips en zoekveld in Menu. Productdetail als bottom sheet (`<dialog>`: focus-trap en Escape gratis).
- Vaste actiebalk boven de onderbalk in Menu (mandjetotaal) en in afrekenen (primaire actie).
- Formulieren: labels boven velden, fouten in tekst naast `aria-invalid`, `inputmode` en `autocomplete`.

## Beweging (één doel per beweging, uit onder `prefers-reduced-motion`)
Tabwissel met view transition (kort, alleen inhoud); springveer op "toevoegen" en badge-bump bij mandjewijziging; sheet schuift omhoog; klantenkaart draait (3D flip, terugval: kruisfade); zon glijdt naar zijn plek bij het openen van Home. Verder niets: geen scroll-parallax, geen stagger op elke kaart.

## Vermeden slop-tells
Gecentreerde gradient-hero, drie gelijke icoonkaarten, verzonnen cijfers ("10.000 klanten"), sterrenscore, "ambachtelijk/vers"-claims, hover-lift, emoji, glas, schaduwen, nepbeoordelingen, een demo-bestelling die op een echte lijkt.

## Zelfbeoordeling (rubric evidence-led-ui, niet onafhankelijk)

Gemeten met `node tools/check-app.mjs` (Playwright, Chromium) op 390x844, 360x740 en 768x1024, `npm run contrast` en `node tools/meet-bundel.mjs`. Screenshots in `docs/screenshots/`.

| Criterium | Score | Bewijs en opmerking |
| --- | --- | --- |
| 1 Specificiteit | 2 | Zonnewijzer met echte openingstijden (Nederlandse tijd), adres, bel en route; demo-klantenkaart met flip |
| 2 Hiërarchie | 2 | Home: status, menukaart-CTA, bel en route; mandje: totaal en één primaire knop |
| 3 Compositie | 2 | Eén kolom (40rem), onderbalk, sticky categoriebalk, vaste mandjebalk in Menu |
| 4 Consistentie | 2 | Eén iconenset, één knopanatomie, één labelsysteem voor demo, voorbeeld en koppeling nodig |
| 5 Typografie | 1 | Eén lettertype, preload; layoutverschuiving bij fontwissel niet apart gemeten |
| 6 Materiaal | 2 | Vlak, 2px lijn, geen schaduw, glas of verloop |
| 7 Staten | 2 | Leeg (mandje, bestellingen, acties, zoeken), fout (velden, laden), uitverkocht, niet beschikbaar, offline, gesloten, laadscherm, reduced motion |
| 8 Responsive | 2 | Drie breedtes, geen horizontale overloop, raakvlakken 44px+ gecontroleerd per scherm |
| 9 Toegankelijkheid | 1 | Eigen audit (namen, kopniveaus, dubbele id's, raakvlakken), toetsenbord, skip-link, sheet-focus en Escape, contrast per token-paar; geen screenreader- of apparaattest |
| 10 Beweging | 2 | Zes bewegingen met doel, allemaal uit onder reduced motion (media query en instelling) |
| 11 Authenticiteit | 2 | Alleen bevestigde feiten; voorbeeldmenu, -prijzen, -foto's, -spaarregels en -acties gelabeld; geen verzonnen aantallen |
| 12 Onderscheidend | 1 | Zonnewijzer en kaart zijn herkenbaar; echte foto's van de zaak ontbreken nog |
| **Totaal** | **21/24** | Grootste winst: eigen foto's, een screenreader-test op een echt toestel |

Prestaties (lokaal, geen netwerkdemping): LCP Home ongeveer 100 ms, Menu ongeveer 110 ms. Eerste start is ongeveer 70 kB gzip (JS-kern 20, CSS 6, lettertype 40, data 3); overige schermen laden pas bij gebruik. Geen Lighthouse-run (niet geinstalleerd, niets toegevoegd).
