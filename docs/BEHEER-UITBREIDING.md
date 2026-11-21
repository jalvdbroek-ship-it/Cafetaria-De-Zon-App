# Beheer

## Wat er nu is

`#/beheer` in de app, in twee standen:

- **Echt (server)**: inloggen met `DEZON_ADMIN_PASSWORD`. Overzicht, bestellingen met status, producten (prijs, categorie, uitverkocht, foto-upload), categorieën, klanten, spaarregels,
  Jackpot en bonnen, acties en openingstijden. Alles staat op de server en geldt voor alle klanten.
- **Demo**: pincode uit `config/app.json` (zichtbaar voor iedereen die de bestanden leest: geen beveiliging). Wijzigingen blijven op het toestel; export en import als JSON.

## Wat nog ontbreekt voor een volwassen beheer

| Onderdeel | Eis |
| --- | --- |
| Inloggen | MFA, meerdere gebruikers en rollen (eigenaar en medewerker), uitloggen op alle toestellen |
| Bestellingen | Geluid of melding bij een nieuwe bestelling, printen voor de keuken, annuleren met reden |
| Menu | Btw, allergenen, planning (vanaf/tot), foto's automatisch verkleinen en oude uploads opruimen |
| Controle | Audit-log ("wie wijzigde de prijs"), versiegeschiedenis |
| Back-up | Nu handmatig (map `data/`), zie `HOSTEN.md` |
