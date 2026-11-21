# De server echt draaien

De demo staat online op GitHub Pages (https://jalvdbroek-ship-it.github.io/Cafetaria-De-Zon-App/). De server is niet gehost en er is niets gekocht. Dit is wat er nodig is om hem echt te draaien.

## Starten (lokaal of op een server)

```
DEZON_ADMIN_PASSWORD="kies-een-lang-wachtwoord" PORT=4200 node server.js
```

Alleen Node 20 of nieuwer; er zijn geen pakketten te installeren. Standaard luistert de server op `127.0.0.1`.

| Instelling | Betekenis |
| --- | --- |
| `DEZON_ADMIN_PASSWORD` | Beheerwachtwoord, minimaal 10 tekens. Zonder wachtwoord staat het beheer uit |
| `PORT`, `HOST` | Poort (4200) en adres (`127.0.0.1`; `0.0.0.0` alleen achter een reverse proxy of firewall) |
| `DEZON_DATA_DIR` | Map voor alle gegevens (standaard `data/`) |
| `DEZON_TRUST_PROXY=1` | Alleen achter een eigen reverse proxy: gebruikt `X-Forwarded-For` en `X-Forwarded-Proto` |
| `DEZON_SECURE=1` | Zet cookies op `Secure` (verplicht zodra je via HTTPS werkt) |
| `DEZON_DEMO=1` | Alleen statische bestanden, geen API: de app draait dan in demo-stand |

## Wat je nodig hebt

- **Een host met Node.** Een kleine VPS of een Node-hosting is genoeg. Richtprijs: een paar euro per maand; controleer de actuele prijs bij de aanbieder. Domeinnaam: ongeveer tien euro per jaar. GitHub Pages kan dit niet.
- **HTTPS.** Zet een reverse proxy ervoor (bijvoorbeeld Caddy of nginx) met een certificaat, en zet `DEZON_TRUST_PROXY=1` en `DEZON_SECURE=1`. Zonder HTTPS reizen wachtwoorden en cookies onbeschermd over het netwerk.
- **Een proces dat blijft draaien** (systemd, pm2 of de dienst van de host) en een herstart na een crash.
- **Back-ups.** Alle gegevens staan als JSON-bestanden in `data/` (bestellingen, klanten, sessies, bonnen, menu, uploads). Kopieer die map regelmatig naar een andere plek. Herstellen is de map terugzetten.

## Beperkingen van deze server (bewust klein gehouden)

- Eén proces; de inlogbeperking staat in het geheugen en begint na een herstart opnieuw.
- Geen e-mail: geen verificatie, geen "wachtwoord vergeten". Een klant die zijn wachtwoord kwijt is, maakt een nieuw account.
- Eén beheerwachtwoord, geen MFA, geen rollen.
- Uploads worden niet automatisch opgeruimd als een product wordt verwijderd.
- Geen betalingen: bestellingen staan op "nog te betalen bij afhalen".

## Dit moet eerst geregeld zijn voor echte klanten

Dit is technische hulp, geen juridisch advies. Laat dit controleren door een jurist of de brancheorganisatie.

1. **Privacy (AVG).** De server bewaart naam, telefoon, e-mail, bestellingen en wachtwoord-hashes. Nodig: een afgemaakte privacyverklaring met naam en contact van de verantwoordelijke, bewaartermijnen, afspraken met de hostingpartij (verwerker) en een manier om inzage- of verwijderverzoeken af te handelen. De app kan een account verwijderen (bestellingen blijven anoniem bewaard); een kopie van gegevens geef je nu handmatig.
2. **Jackpot.** Een rad met prijzen bij een aankoop kan onder de Nederlandse kansspelregels vallen (prijs, kans en een aankoop zijn de bouwstenen). Daarom staat de Jackpot op de server standaard uit, levert elke draai een prijs en is er geen geld of uitbetaling. Laat de spelregels toetsen, onder meer bij de Kansspelautoriteit of een jurist, voordat je hem aanzet. Kansen zijn zichtbaar in de app.
3. **Consumentenregels.** Prijzen inclusief btw, duidelijke afhaalvoorwaarden, wat er gebeurt bij annuleren en uitverkocht.
4. **Echte gegevens.** Producten, prijzen, foto's, acties en spaar- en Jackpot-regels in de app zijn voorbeelden tot de eigenaar ze bevestigt (beheer: "Prijs bevestigd").
5. **Wachtwoord.** Kies een lang, uniek beheerwachtwoord en deel het niet in chats of code.
