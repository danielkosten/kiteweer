# Hoe kiteweer in elkaar zit

## 1. Wat staat waar

Met de hand geschreven = jij of een agent typt het. Door de machine = een script overschrijft het,
elke handmatige wijziging is de volgende run weg.

| Bestand | Wat het doet | Wie schrijft het |
|---|---|---|
| `index.html` | de pagina zelf, laadt de zeven bestanden hieronder in vaste volgorde | met de hand |
| `app.js` | alle oordelen, cijfers, tabel, kaart en knoppen. 1090 regels, het hart | met de hand |
| `stijl.css` | de look, Daniels huisstijl | met de hand |
| `laad.js` | haalt tijdens het bezoek de wind live op bij Open-Meteo (een gratis weerdienst), 30 minuten bewaard in de browser | met de hand |
| `data.js` | de 64 spots met hun veilige windhoeken, curatie van Arthur | met de hand (overgezet uit windcalendar) |
| `uur.js` | terugval-bundel: de wind van 4 spots, voor als Open-Meteo tijdens het bezoek niet antwoordt | **door de machine** (`gen-uur.mjs`) |
| `stroom.js` | de getijstroom per meetpunt, 10 minuten uit elkaar | **door de machine** (`gen-stroom.mjs`) |
| `meting.js` | wat de meetpalen vandaag echt gemeten hebben | **door de machine** (`gen-meting.mjs`) |
| `gen-uur.mjs`, `gen-stroom.mjs`, `gen-meting.mjs` | de drie ophalers die die drie bestanden schrijven | met de hand |
| `ijk.mjs` | rekentoets zonder browser: kloppen de grenzen en de cijfercurve nog | met de hand |
| `dubbel.mjs` | kijkt of elk geijkt getal nog maar op EEN plek staat, en of de stroming maar op een plek beoordeeld wordt | met de hand |
| `qa.mjs` | zet een echte browser op de pagina en kijkt of er niets stuk is | met de hand |
| `verifieer.mjs`, `toets-horizon.mjs` | eenmalige metingen: hoe goed elk weermodel het deed. Draaien niet in de keten | met de hand |
| `.github/workflows/meting.yml`, `stroom.yml` | opdrachten die op GitHub kunnen draaien, zie hieronder | met de hand |
| `qa-*.png` | schermafdrukken die `qa.mjs` bij elke run overschrijft | **door de machine** |
| `docs/adr/*.md`, `docs/dajk-mix.md`, `docs/stroom.md` | waarom een keuze zo is gemaakt | met de hand |

## 2. Waar de gegevens vandaan komen

| Wat | Script | Bron | Schrijft | Hoe vaak |
|---|---|---|---|---|
| wind, golven, weer, zon (tijdens het bezoek) | `laad.js`, in de browser | Open-Meteo | niets, blijft in de browser | elk bezoek, 30 min bewaard |
| terugval-wind, 4 spots | `gen-uur.mjs` | Open-Meteo | `uur.js` | elke nacht 02:20 UTC, via `stroom.yml` op GitHub |
| getijstroom, 35 spots | `gen-stroom.mjs` | Rijkswaterstaat MATROOS, alleen astronomisch getij | `stroom.js` | elke nacht 02:20 UTC, via `stroom.yml` op GitHub |
| echte metingen van de palen | `gen-meting.mjs` | Rijkswaterstaat MATROOS | `meting.js` | **elke 10 minuten op de eigen VPS srv1410799**: `/opt/kiteweer/ververs.sh`, klok in `/etc/cron.d/kiteweer`, log in `/var/log/kiteweer.log` |

- `.github/workflows/meting.yml` heeft **geen klok meer**, alleen nog een knop om het met de hand te
  starten. De gratis klok van GitHub startte maar een run per 2 tot 5 uur, en de palen meten elk kwartier.
- `stroom.yml` draait wel nog op de klok van GitHub, elke nacht, en doet twee dingen in een run:
  eerst de stroming, dan de terugval-bundel.
- Beide opdrachten committen zelf in deze repo. **Altijd `git pull --rebase` voor je pusht.**

Wat er gebeurt als het ophalen mislukt:

| Script | Bij een hik |
|---|---|
| `gen-uur.mjs` | vier pogingen, 30 seconden geduld. Een spot die het niet haalt houdt zijn vorige uren. Lukt geen enkele spot, dan blijft `uur.js` staan zoals hij was |
| `gen-stroom.mjs` | een meetpunt dat niet antwoordt houdt zijn oude reeks, zolang die nog minstens 2 dagen vooruit reikt. Lukt geen enkel punt, dan wordt er niets geschreven |
| `gen-meting.mjs` | een station dat niet antwoordt houdt zijn oude uren. De lijst met stations zit in `meting.js` zelf, dus een mislukte cataloguscall is niet fataal |
| `laad.js` (in de browser) | valt terug op `uur.js` en zet "niet live" in de voet |
| beide workflows | de stappen staan op `continue-on-error`: een mislukte bron sleept de andere niet mee, en er wordt gecommit wat wel lukte |

## 3. Wat raakt wat

De hele pagina hangt aan één som: **druk = jouw grootste kite gedeeld door de maat die bij die wind
ideaal is.** Alles hieronder hangt daar weer aan.

| Verander je dit | Dan verandert ook | En dit toetst het |
|---|---|---|
| `st.board` (twintip of directional) | `KLEINER[st.board]` → `ideaal()` en `knBij()`, dus élk oordeel, elk cijfer, de kitemaat, de legenda | `ijk.mjs`: de sessie van 04-09 op directional, plus 20 heen-en-terug-sommen |
| `st.kg` (gewicht) | `ideaal()`, `knBij()`, dus alle oordelen en cijfers; de kop van de kite-rij; de uitleg in het kite-venster | `ijk.mjs`, maar alleen op 85 kg (plus 45 en 120 kg in de heen-en-terug-toets) |
| `st.groot` (grootste kite) | `GROOT()` → `druk()`, `knBij()`, `genoegKn()`, het advies `kiteAdvies/kiteBereik`, de streep in de weekbalk, de legenda | `ijk.mjs` toetst dat de ondergrens meebeweegt: 9 m geeft 20 kn, 17 m geeft 11 kn |
| `st.spot` | `spot()`, `veilig()`, `optelling()`, `uren()` (de cache-sleutel), `versStroom()`, `meetstation()`, `fijnBij()` | niets rekenkundigs. `qa.mjs` kijkt alleen naar de standaardspot |
| `bewaar()` / `uitAdres()` | schrijft spot, gewicht, kite, board en mix zowel in de browseropslag als in het webadres. Het adres wint bij het laden, zodat dezelfde link overal dezelfde pagina geeft | **niets**; met de hand getoetst op een gedeelde link, een harde verversing en rommel in de link |
| `st.modellen` | welke modellen in `uren()` meedoen, `gewichten()`, `fijnBij()`, de tekst op de modelknop | niets |
| `st.mix` | klassegewicht in `gewichten()`, de optelling voor grove modellen, of de sessiekans uit de ensembles wordt gerekend (`uren()`, `kansPerDrempel()`) | niets |
| `ideaal()` | `druk()`, `knBij()` (eigen kopie van de som), `staat()`, `kiteAdvies()`, de uitleg in het kite-venster | `ijk.mjs` leest `KITEFACTOR` en rekent er alles mee na |
| `druk()` | `band()` → `niveau()` → de kleuren, de tabel, de weekbalk, `vensters()`; en `cijfer()` en `uurDelen()` via `startCijfer()`; de woorden in `openCijfer()` | `ijk.mjs`, indirect via de vier grenzen en de cijfercurve |
| `knBij()` | `genoegKn()`, de legenda (`openLegenda`), de zin "een 9 zit tussen X en 30 kn" in `openCijfer()` | `ijk.mjs`: de vier grenzen en de 20 heen-en-terug-sommen met de afkapping op 3 m |
| `genoegKn()` | de gate in `uren()` (welke modellen "ja" stemmen), de sessiekans, de kans uit de ensembles, de streep in de weekbalk plus de uitleg eronder, de kop van de sessiekans-rij, de oker kleurschaal `knKleur()`, het vlagerig-plusje in de tabel | `ijk.mjs`, via `knBij(DRUK_GOED)` = 14 kn |
| `band()` | `niveau()`, en daarmee echt alles wat gekleurd of beoordeeld is | `ijk.mjs` toetst de grenzen, niet de functie zelf |
| `werkKn()` | `niveau()`: de wind waarmee je echt rijdt, dus wind plus of min de stroom in de windrichting. Verandert alleen het OORDEEL, nooit het windgetal in de tabel | `ijk.mjs` niet rechtstreeks; de ondergrenscontrole raakt hem wel |
| `niveau()` | tabelkleuren, weekbalk, schuifbalk, `vensters()`, `uurDelen()` (geeft niets terug bij te weinig of aflandig), de tekst "Niet: ..." in de samenvatting, de pijlkleur | `qa.mjs` ziet alleen dat er iets staat, niet of het klopt |
| `CURVE` / `startCijfer()` | `cijfer()` (venstercijfer) én `uurDelen()` (uurcijfer), en daarmee de volgorde van de vensters, de keuze van de beste dag en de beste uren | `ijk.mjs`: acht punten op de curve, de eis dat hij stijgt naar Daniels band, dat 33 kn hoger scoort dan 16 kn, en dat een 10 net niet uit de wind alleen komt |
| `cijfer()` | het getal op elke vensterknop, `scoreVan()` → de sortering van de vensters en de beste dag van de week, het venster-uitlegvenster | alleen het startcijfer via `ijk.mjs`. De optelposten zelf: **niets** |
| `uurScore()` / `uurDelen()` | welke uren "beste uren" heten, het cijfer boven de samenvatting, de opbouw in het cijfer-venster | **niets** |
| `vensters()` | `dagOordeel()` → de hero, de dagkaartjes, de balk in de tabel, de weekbalk, de samenvatting, de beste dag van de week. Knipt sinds 12-09 ook waar de stroom omslaat (`stroomZone`, `KENTERING`), met stukken van minstens twee uur | **niets** |
| `cijferWoord()` / `cijferNiveau()` | het woord en de kleur van een sessie: de kaartjes, de balk in de tabel, de dagkop, de tint van de hero. Volgt het cijfer, niet de wind | **niets** |
| `besteUren()` / `golfGem()` / `stroomZin()` | de bullets op elk sessiekaartje | **niets** |
| `feitRegel()` / `meetZin()` / `stroomRegel()` | de twee regels onder de kaartjes: liep het vandaag hoger dan het model zei, en wanneer draait de stroom | **niets** |
| `zetUur()` | de schuif en de afspeelknop op de strandkaart. Hertekent bewust alleen `tekenScene()`, niet de hele pagina | **niets** |
| `tekenVers()` | de regel bovenin over de modellen en de meetpaal. Leest de rekentijd van het nieuwste model via `KWU_RUNS()`, NIET de tijd van het bezoek | **niets** |
| `vlaagKleur()` | de kleur van het vlaagplusje in de tabel, van grijs via oker naar rood | **niets** |
| `VEEL` (30) | de band "hard" in `band()`, de 1,5x zwaardere strafposten in `cijfer()`, de zin "hard en goed powered", de legenda, de uitleg bij de sessiekans en bij het cijfer | `ijk.mjs` pint 30 vast |
| `TEVEEL` (40) | de gate in `uren()` (te hard telt als nee), de kans uit de ensembles, de kop van de sessiekans-rij, "te hard" onder het percentage, twee uitlegvensters | `ijk.mjs` pint 40 vast |
| `DRUK_GOED` (0,97) | `band()` en `genoegKn()`, dus de hele ondergrens van de pagina | `ijk.mjs`: moet 14 kn geven bij 85 kg en 13 m |
| `DRUK_PERFECT` (1,32) | `band()` en de legenda | `ijk.mjs`: moet 19 kn geven |
| `VLAGERIG` (1,8) | de strafpost `STRAF_VLAGERIG` in `cijfer()`, `uurDelen()` en `urenDelen()`, het woord bij de windhoek, het oker plusje in de tabel, de reden-tekst `waarom()` | `ijk.mjs`: geen van Daniels drie sessies mag vlagerig heten |
| `STABIEL` (1,35) | de bonus "stabiele wind" in `cijfer()`, het woord bij de windhoek | niets |
| `MAATJE_KLEINER` (1,6) | `kiteAdvies()` (een maat kleiner bij vlagen), de kite-regel in het venster-uitlegvenster | niets |
| `KLEINER` (twintip 0, directional 1,5) | `ideaal()`, `knBij()`, en de nakijkregel op de browseropslag | `ijk.mjs` leest de directional-waarde en toetst de sessie van 04-09 |

## 4. De valkuilen

| Val | Wat er echt gebeurde |
|---|---|
| Een hulpvariabele die je in de ene functie zet, bestaat niet in de andere | Een woord uit `kansPerDrempel` werd in `openZeker` gebruikt; het kansvenster ging stil niet meer open, `qa.mjs` zag "venster zeker: DICHT" (commit 2e0e9d9) |
| Dezelfde regel op twee plekken loopt uit elkaar | Vlagerig stond vijf keer in de code, in twee eenheden (1,5 · 1,6 · 1,8 · +10 kn · +6 kn), dus een uur kon tegelijk "stabiel" en "gusty" heten. Nu één getal `STRAF_VLAGERIG`, gebruikt door alle drie de sommen |
| De omgekeerde som vergat de afkapping | `ideaal()` kapt af op 3 m, dus onder die maat bestaat de gevraagde druk niet. Zonder rem gaf `knBij()` daar een wind die niet klopte met het oordeel ernaast. Valt op bij een lichte rijder op een kleine kite, niet bij Daniel (commit b3c346d) |
| Een waarde uit de browseropslag die niemand nakeek | Een onbekende boardnaam maakte `KLEINER[st.board]` leeg, en dan werd elke som stil "geen getal": geen foutmelding, alleen lege vakjes. Gewicht en kitemaat vielen al terug, het board niet |
| Sorteren op het woord in plaats van op het cijfer | Een dag van 16 kn ("goed") won van een dag van 33 kn ("hard"), terwijl die tweede hoger scoort. Zowel de vensters als de beste uren gaan nu op het cijfer |
| Ronden waar je rekent | Boven de beste uren stond ooit 6,265151515151515. Rond af waar je het toont (`half()`, `getal()`), nooit in de som |
| Instellingen die alleen per apparaat leven | Spot, gewicht, grootste kite en board zaten alleen in de browseropslag. Telefoon stond op Zandmotor, laptop op Wassenaarse Slag, 17 km verderop: 16-19 kn tegen 16-17 kn, en dat las als een kapotte app (12-09). Sinds die dag draagt het webadres ze alle vier plus de mix, en wint het adres van de opslag |
| Een open pagina die nooit opnieuw ophaalt | Wind, metingen en stroming kwamen een keer binnen bij het laden; de minuutklok tekende daarna alleen opnieuw met diezelfde cijfers. Een telefoon die uren in je zak zit toonde dus de ochtend terwijl een verse laptop het nu toonde, en dat leest als "de app klopt niet" (12-09). Sinds die dag: ouder dan 10 minuten en je komt terug op de pagina = opnieuw laden |
| Korte namen in één groot bestand | `app.js` is 1090 regels met korte functienamen. Kijk of een nieuwe naam nog vrij is, en kijk na een wijziging naar de hele pagina, niet naar een uitsnede |
| De bot commit zelf | De VPS pusht elke 10 minuten `meting.js`. Pull met rebase voor je pusht, anders botst het |

## 5. Hoe je een wijziging veilig doorvoert

```
cd /Users/danielunravel/Code/personal/kiteweer
node ijk.mjs                                          # rekentoets, 1 seconde, geen browser
node dubbel.mjs                                       # staat elke regel nog maar op een plek
node qa.mjs http://localhost:8899/                     # of tegen de live URL, zie hieronder
git pull --rebase && git commit -am "..." && git push
# wacht tot GitHub Pages de nieuwe pagina serveert (ongeveer een minuut)
node qa.mjs https://danielkosten.github.io/kiteweer/
```

Daarna hetzelfde naar papa's repo:

```
cd /Users/danielunravel/Code/personal/windcalendar
git checkout daniel-view
cp /Users/danielunravel/Code/personal/kiteweer/{index.html,app.js,stijl.css,laad.js,data.js} static/daniel/
cp /Users/danielunravel/Code/personal/kiteweer/{gen-uur.mjs,gen-stroom.mjs,gen-meting.mjs,qa.mjs} docs/daniel-view/
git commit -am "..." && git push
```

- **Wel meekopiëren:** `index.html`, `app.js`, `stijl.css`, `laad.js`, `data.js` naar `static/daniel/`,
  en de scripts naar `docs/daniel-view/`.
- **Niet meekopiëren:** `uur.js`, `stroom.js`, `meting.js`. Die staan daar wel, maar lopen altijd
  achter, want de klok op de VPS schrijft alleen in kiteweer. Ze overschrijven levert alleen ruis in
  het verschil op.
- `ijk.mjs` staat nog helemaal niet in windcalendar. Zet hem daar neer of laat hem hier, maar weet
  dat de toets daar dus niet draait.

Wat de twee toetsen echt controleren:

| `node ijk.mjs` | de vier windgrenzen bij 85 kg met een 13 m (14 · 19 · 30 · 40 kn), dat de standaardmaat binnen de keuzelijst 4 tot 15 m valt, dat de ondergrens meebeweegt met een andere kitemaat, acht punten van de cijfercurve, dat de curve stijgt naar Daniels band, dat 33 kn hoger scoort dan 16 kn, dat een 10 bestaat maar niet uit de wind alleen, dat zijn **vier** echte sessies goed beoordeeld worden (waaronder 07-09, zijn ondergrens-sessie op ~17 kn), dat de ondergrens tussen 12 en 15 kn blijft, en 20 heen-en-terug-sommen |
|---|---|
| `node dubbel.mjs` | dat de geijkte getallen (2,2 · 1,8 · 1,34 · 1,6 · 0,97 · 1,32 en de rest) elk maar een keer in `app.js` staan, dat elke naam ook echt gebruikt wordt, en dat de stroomsterkte alleen in `stroomPost()` tot een oordeel leidt |
|---|---|
| `node qa.mjs <url>` | op 390 en 1200 px breed: steekt een invoerveld buiten zijn pil, stopt er ergens vet midden in een tijd of getal, lekt er ruwe code of "undefined" de pagina in, schuift de pagina zijwaarts, steekt er iets buiten het scherm, staan zeven vaste onderdelen er echt en zijn ze zichtbaar, zijn er fouten in de browser, en gaat élke i-knop open, past het venster in beeld en lekt er niets in. Schrijft `qa-mobiel.png` en `qa-breed.png` |

## 6. Wat nergens door getest wordt

- **Het woord en de kleur van een sessie** (`cijferWoord`, `cijferNiveau`) en de vlaagkleur
  (`vlaagKleur`): de grenzen 8,5 / 7 / 5,5 / 4 en 1,4 tot 2,0 zijn gekozen, niet gemeten.
- **De optelposten van het cijfer.** −1 vlagerig, de stroomposten (+0,5 tegen, −0,5 tot −1,5 mee), −0,5 golven, −0,5 regen, de
  duurpost (+0,5 boven twee uur, en duur kan nooit punten kosten), en de 1,5x zwaardere straf boven 30 kn: allemaal geraden gewichten, door niets getoetst.
- **Het uurcijfer** (`uurDelen`, `urenDelen`) helemaal. Het gebruikt dezelfde curve en dezelfde
  drempels als het sessiecijfer, maar minder posten, en niemand meet of ze bij elkaar passen.
- **`vensters()`**: hoe uren tot een venster worden geplakt en welk woord dat venster krijgt.
- **De stroming en de golven**: `stroomC()`, `stroomOordeel()`, `golfOordeel()`, de kentering.
- **De sessiekans en de ensembles**: de gate in `uren()`, `kansPerDrempel()`, `kansTekst()`.
- **De meetketen**: `metingBij()`, `afwijkingVandaag()` en de zin "vandaag staat er meer wind dan
  voorspeld" worden door geen enkele toets aangeraakt.
- **Een ander gewicht dan 85 kg** buiten de heen-en-terug-som, en elke andere spot dan de standaard.
- **De kaartjes zelf**: `sessieKaart()`, `topUur()`, en de grenzen daarin (een topuur moet een heel punt hoger scoren).
- **De geometrie van de knoppen**: gelijke hoogtes, niets dat buiten beeld valt, de scrollpositie die
  blijft staan. Alle drie met de hand nagemeten, nergens vastgelegd.
- **Het afspelen van de dag** (`startSpelen`, `zetUur`): dat de knop stopt bij een klik elders, en
  dat `zetUur()` dezelfde staat achterlaat als een klik op een kolom, staat nergens vast.
- **De verse regel bovenin** (`tekenVers`, `geleden`, `KWU_RUNS`): de grenzen waarboven een puntje
  oker kleurt (meetpaal 45 minuten, modellen 6 uur) zijn gekozen, niet gemeten. Welke modellen een
  `meta.json` hebben staat als `meta: true` in `laad.js`; valt er een weg, dan merk je dat niet.
- **De drie ophalers** (`gen-*.mjs`) hebben geen enkele toets; je merkt een fout pas als de pagina
  leegloopt.
