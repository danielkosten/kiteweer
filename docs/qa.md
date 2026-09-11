# QA: altijd draaien na een deploy

```bash
node qa.mjs                                     # tegen de lokale server
node qa.mjs https://danielkosten.github.io/kiteweer/   # tegen de echte site
```

Vereist Playwright. Staat die er niet, dan eerst `npm i playwright && npx playwright install chromium`
in een tijdelijke map, of draai het script vanuit een map waar Playwright al staat.

Het script opent de pagina op 390 px en 1200 px en kijkt op allebei:

| Controle | Waarom |
|---|---|
| JS-fouten en mislukte requests | een stille fout laat de halve pagina leeg |
| ruwe code in de tekst (`function (`, `undefined`, `NaN`, `[object`) | op 11-09 stond de broncode van een hulpfunctie boven de tabel, omdat hij een bestaande variabele overschreef |
| zijwaartse schuif | de pagina hoort nooit horizontaal te schuiven, alleen de tabel zelf |
| elementen buiten beeld | verraadt een te brede kaart of knop |
| vaste onderdelen aanwezig en zichtbaar | week-overzichtsbalk, weekrij, uurtabel, legenda; een regel in een media-query kan iets stil laten verdwijnen |
| elk uitlegvenster open, passend, zonder lek | vier i-knoppen, allemaal |

Eindigt met `QA: alles goed` of een lijst problemen en afsluitcode 1. Screenshots komen in
`qa-mobiel.png` en `qa-breed.png`, altijd zelf bekijken: het script ziet geen lelijke opmaak.
