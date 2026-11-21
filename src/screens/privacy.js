import { html } from "../lib/dom.js";
import { icon } from "../components/icons.js";

export default {
  title: "Privacy",
  render(app) {
    const { site } = app.data;
    return html`
      <a class="link back" href="#/account">${icon("back")} Account</a>
      <h1>Privacy</h1>
      <p class="demo-banner"><span><strong>Concept</strong>Deze tekst is een voorlopige samenvatting van wat de ${app.demo ? "demo" : "app"} doet. De eigenaar of een jurist moet hem nog controleren voordat de app echt wordt gebruikt (verantwoordelijke, bewaartermijn, verwerkers).</span></p>
      ${app.demo ? html`
      <section class="stack prose"><h2>Wat staat er op je toestel?</h2>
        <p>Alles wat je invult blijft in de opslag van je eigen browser (localStorage): naam, telefoonnummer, e-mailadres, je mandje, je demo-bestellingen, je demo-punten en je favorieten.</p></section>
      <section class="stack prose"><h2>Wat verlaat je toestel niet?</h2>
        <p>Niets. De app stuurt geen gegevens naar De Zon of naar een ander bedrijf. Er zijn geen cookies, geen statistiek, geen advertenties en geen externe lettertypes. Een demo-bestelling bereikt De Zon dus niet.</p></section>
      <section class="stack prose"><h2>Links naar buiten</h2>
        <p>Route, bellen en mailen openen Google Maps, je belapp of je mailapp. Daar gelden de regels van die diensten.</p></section>
      <section class="stack prose"><h2>Wissen</h2>
        <p>Onder Account kies je "Wis mijn gegevens op dit toestel". Dan verdwijnt alles. Je kunt ook de websitegegevens van deze app in je browser verwijderen.</p></section>
      <section class="stack prose"><h2>Straks, met een echte koppeling</h2>
        <p>Zodra bestellen, sparen of accounts via een server lopen, verandert dit. Dan zijn onder meer nodig: een duidelijke verantwoordelijke, een bewaartermijn, een verwerkersovereenkomst met de leverancier, uitleg over inzage en verwijdering (AVG), en toestemming voor alles wat niet strikt nodig is. Zie docs/PUBLICEREN.md.</p></section>
      ` : html`
      <section class="stack prose"><h2>Wat bewaart De Zon?</h2>
        <p>Bij een bestelling: je naam, telefoonnummer, eventueel e-mailadres, je opmerking, wat je besteld hebt en het afhaalmoment. Met een account ook je wachtwoord (alleen als beveiligde hash), je spaarpunten, bonnen en favorieten. Dit is nodig om je bestelling klaar te maken, je te bellen als er iets is en je punten bij te houden.</p></section>
      <section class="stack prose"><h2>Wat bewaart je toestel?</h2>
        <p>Je mandje, je instellingen, favorieten als je niet bent ingelogd en een sleuteltje per bestelling zodat je jouw bestelling kunt terugvinden. Als je inlogt, gebruikt de app één cookie om je ingelogd te houden. Er zijn geen advertentie- of statistiekcookies en geen externe lettertypes.</p></section>
      <section class="stack prose"><h2>Delen</h2>
        <p>Je gegevens staan op de server van De Zon en worden niet doorverkocht of aan advertentiepartijen gegeven. Route, bellen en mailen openen Google Maps, je belapp of je mailapp; daar gelden de regels van die diensten.</p></section>
      <section class="stack prose"><h2>Je rechten</h2>
        <p>Onder Mijn De Zon kun je je gegevens aanpassen en je account verwijderen. Daarna blijven oude bestellingen voor de administratie bewaard, zonder je naam, telefoonnummer en e-mailadres. Wil je een kopie van je gegevens of heb je een vraag? Mail of bel De Zon.</p></section>
      <section class="stack prose"><h2>Jackpot</h2>
        <p>Voor een draai aan de Jackpot bewaren we bij je bestelling welke prijs je won en de bijbehorende bon.</p></section>
      `}
      <p class="small muted">Vragen: ${site.email} of ${site.phoneDisplay}.</p>`;
  },
};
