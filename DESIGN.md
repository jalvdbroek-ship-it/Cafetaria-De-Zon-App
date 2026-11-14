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
Wordt ingevuld in stap 14 na de metingen.
