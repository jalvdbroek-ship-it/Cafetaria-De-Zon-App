# Publiceren (nog niets gedaan)

Alleen de demo staat online (GitHub Pages). Er is **niets in een appstore geplaatst of betaald**. Dit document beschrijft de opties. Regels en bedragen van Apple,
Google en hosters veranderen; de genoemde punten komen uit het ontwerp en uit secundaire bronnen (november 2026) en
moeten bij publicatie bij de bron zelf worden gecontroleerd.

## Voor je iets publiceert

1. De eigenaar keurt tekst, kaart en prijzen goed (`bevestigd: true`) en levert eigen foto's (de Pexels-voorbeeldfoto's en
   het label "Voorbeeldfoto" verdwijnen via `src/data/fotos.json`).
2. Besluit of bestellen in de app echt moet werken. Zonder koppeling blijft het een **demo** en hoort de app niet in de
   winkels (zie hieronder).
3. De privacytekst (`#/privacy`) is een concept en moet door de eigenaar of een jurist worden gecontroleerd.
4. Als bestellen, accounts of sparen via een server gaan: AVG-inventaris, verwerkersovereenkomst, bewaartermijnen,
   inzage- en verwijderverzoeken, en voor betalingen een erkende betaalprovider.

## Optie A: PWA op eigen hosting (aanbevolen eerste stap)

- Statische hosting volstaat (bestanden in deze map; `server.js` is alleen voor lokaal gebruik). Vereist **HTTPS**, anders
  werken service worker en installeren niet.
- Alle paden zijn relatief, dus een submap werkt (bijvoorbeeld `https://domein.nl/app/`).
- Zet `X-Content-Type-Options: nosniff` en `Cache-Control: no-cache` op `sw.js`. Verhoog `VERSION` in `sw.js` bij elke
  release en draai `npm run sw-lijst` na het toevoegen van bestanden.
- Installeren: Android-browsers bieden "Installeren" aan; op iPhone via Delen, "Zet op beginscherm".
- Kosten: gewone webhosting en domein (zelf te kiezen); geen winkelaccount nodig. Verwijder `noindex` in `index.html`
  alleen als de app bedoeld is om gevonden te worden.

## Optie B: App Store en Google Play via Capacitor (later)

Capacitor verpakt deze PWA als native app zonder de code te herschrijven. Nog niet gedaan en niet geinstalleerd.

| Onderwerp | Apple App Store | Google Play |
| --- | --- | --- |
| Account | Apple Developer Program, ongeveer 99 USD per jaar; Mac met Xcode nodig voor bouwen en indienen | Eenmalig ongeveer 25 USD; identiteitscontrole |
| Extra drempel | Beoordeling: een verpakte website zonder echte app-waarde kan worden afgewezen (minimale functionaliteit); demo-bestellen die niets doet is een risico | Voor nieuwe persoonlijke accounts was gesloten testen vereist (ongeveer 12 testers, 14 dagen); controleer of dit voor jouw accounttype nog geldt |
| Gegevens | Privacylabels en privacybeleid-URL verplicht | Formulier "Gegevensbeveiliging" en privacybeleid verplicht |
| Overig | Screenshots per schermformaat, supportadres, leeftijdsindicatie | Idem, plus doelgroepverklaring |

**Advies:** pas naar de winkels als bestellen echt werkt en er een duidelijke reden is om een app te hebben (pushmeldingen,
spaarkaart, snelle herbestelling). Tot die tijd is de PWA genoeg.

## Accounts en eigendom

Laat de eigenaar de winkelaccounts (Apple, Google) en het domein op **eigen naam** aanmaken; dan blijft de app van De Zon
als de ontwikkelaar wisselt. Bewaar geen wachtwoorden of sleutels in deze repo.

## Checklist release

- [ ] `npm test` en `node tools/check-app.mjs` groen
- [ ] `npm run contrast` groen
- [ ] Alle voorbeeldlabels beoordeeld (menu, foto's, spaarregels, acties)
- [ ] `demo-pin` verwijderd uit de client als het beheer echt wordt
- [ ] Privacytekst gecontroleerd door eigenaar of jurist
- [ ] HTTPS, `VERSION` in `sw.js` verhoogd
