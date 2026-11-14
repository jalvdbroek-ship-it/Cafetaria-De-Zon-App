# Onderzoek en bronnen

Bijgewerkt: 14 november 2026.

## Eatbu-pagina (https://cafetariadezon.eatbu.com/?lang=nl), opnieuw opgehaald

| Gegeven | Stand |
| --- | --- |
| Diensten | "Afhaalservice" (geen bezorging, geen online bestelmodule zichtbaar) |
| Betaalwijzen | Contant, Pin |
| Menukaart, prijzen, sauzen, menu's | **Niet op de pagina.** Onbekend. |
| Openingstijden | De pagina toont alleen "We zijn gesloten" en "Keuken is geopend" (live status); de tijden komen uit het eerdere onderzoek in `data/site.json` van de site |
| Cookies | Cookiebanner met statistiek en marketing; deze app gebruikt **geen** cookies of trackers |

Conclusie: er bestaat geen echte kaart, prijslijst of bestelkoppeling om over te nemen. De app toont daarom een
**voorbeeldmenu** (`src/data/menu.json`, alles `bevestigd: false`) en een **demo-bestelflow**.

## Bevestigde feiten (`src/data/site.json`)

Noordeinde 12, 3238 BG Zwartewaal; 0181 66 36 69; cdezon146@gmail.com; pin en contant; di t/m do 12:30 tot 22:00,
vr en za 12:30 tot 23:00, zo 12:30 tot 21:00, maandag gesloten; categorieen frites, hamburgers, snacks,
vegetarisch, ijs, dranken.

## Voorbeeld (niet van De Zon)

Alle productnamen, omschrijvingen en prijzen, optiegroepen, sauzen, de spaarregels, de acties, de beloningen en de
11 foto's (Pexels, zie `ASSETS-EN-LICENTIES.md` in de website-map). Overal in de app als voorbeeld gelabeld; de vlag
`voorbeeld`/`bevestigd` bepaalt het label.

## Skillry

Zoekopdracht "mobile app food ordering loyalty card PWA" (type other): geen geschikte Skill gevonden. Er is niets
geinstalleerd en geen Premium gebruikt. Gebruikt zijn de al aanwezige skills `evidence-led-ui`, `compliance-guard` en
`tdd` als werkwijze.

## Locatie

Volgens `AGENTS.md` van GG-Projecten horen apps in `05-Spellen-En-Apps/`. De website `cafetaria-de-zon` en
`cafetaria-de-zon-v2` zijn niet aangepast; data, lettertype en foto's zijn gekopieerd.
