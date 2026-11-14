# Beheer: van demo naar echt

## Wat het demo-beheer nu is

`#/beheer` in de app, achter een pincode uit `config/app.json`. Producten (naam, prijs, uitverkocht, uitgelicht,
bevestigd), acties, spaarregels, openingstijden en afhaalinstellingen, bestellingen van dit toestel, export en import
als JSON. Alles staat in `localStorage` van **dat ene toestel**. De pincode is zichtbaar voor iedereen die de bestanden
kan lezen: het is een demo van de schermen, geen beveiliging.

## Wat een echt beheer nodig heeft

| Onderdeel | Eis |
| --- | --- |
| Inloggen | Aparte beheerrol, wachtwoord met MFA, sessie op de server, uitloggen op alle toestellen |
| Opslag | Database op een server; wijzigingen zichtbaar voor alle klanten; versiegeschiedenis ("wie wijzigde de prijs") |
| Rechten | Minimaal eigenaar (alles) en medewerker (uitverkocht zetten, bestellingen bekijken) |
| Bestellingen | Binnenkomende bestellingen live (geluid of melding), status bijwerken, afdrukken voor de keuken, annuleren met reden |
| Menu | Foto's uploaden (met afmetingen en compressie), prijs en btw, allergenen, planning (vanaf/tot) |
| Acties | Plannen, tonen op Home, koppelen aan spaarregel |
| Spaarregels | Wijzigen met ingangsdatum; bestaande punten blijven geldig |
| Controle | Audit-log, back-up en herstel, rate limiting op inloggen |

## Aanbevolen volgorde

1. Kies een bestelplatform of bouw een kleine server (`API-CONTRACT.md`).
2. Zet bestellingen van de app eerst op alleen e-mail of print bij De Zon (laagste risico), dan pas betalen.
3. Bouw het beheer als aparte route met eigen inlog; hergebruik de bestaande schermen in `src/screens/admin/`
   door `LocalDemoSource` te vervangen door `HttpSource`.
4. Verwijder de pincode en `config/app.json` uit de client zodra de server de controle doet.
