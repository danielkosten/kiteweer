# Welke meetgegevens hebben we echt?

Geteld op 12-09-2026. Elk getal hieronder komt uit een bestand dat is opengemaakt
en geteld, of uit een verzoek dat echt is verstuurd. Niets geschat.

## Lees dit eerst: het gat dat een toets ongeldig maakt

**Deze repo bewaart geen geschiedenis van metingen. Nul.** `meting.js` houdt een
schuivend venster van 18 uur vast en wordt elke 10 minuten overschreven. Wie het
model wil toetsen tegen "de afgelopen maanden", vindt hier 18 uur.

De git-geschiedenis helpt nauwelijks: 33 opgeslagen versies van `meting.js`, samen
**41 unieke uren, van 10-09-2026 19:00 UTC tot 12-09-2026 11:00 UTC. Dat is 1,7 dag.**

Maar het is te repareren, en goedkoop: dezelfde bron waar de repo nu uit tapt
(Rijkswaterstaat MATROOS) levert **twee jaar terug** metingen, en KNMI levert
jaren terug. De geschiedenis moet alleen nog een keer opgehaald en weggeschreven
worden. Zonder die stap heeft een toets geen materiaal.

Tweede ding dat een toets omgooit: van de fijne weermodellen bestaat alleen de
voorspelling van **één dag vooruit** in het archief. Dag 2 tot en met 7 is leeg.
Je kunt dus niet toetsen of Harmonie drie dagen vooruit deugt. Nooit. Zie de
matrix verderop.

## 1. Wat deze repo zelf bewaart

Drie bestanden. Alle drie worden ze overschreven, geen enkele groeit aan.

| Bestand | Wat erin staat | Periode in het bestand nu | Wie schrijft het | Hoe vaak | Bewaart oude waarden? |
|---|---|---|---|---|---|
| `meting.js` | Echte metingen van windpalen | 11-09 17:00 t/m 12-09 10:00 UTC, 18 uur | `gen-meting.mjs` | elke 10 min, cron op de VPS | Nee, venster van 18 uur |
| `uur.js` | Voorspellingen per model, 7 dagen vooruit | 12-09 00:00 t/m 18-09 23:00 lokaal, 168 uur | `gen-uur.mjs` | elke nacht | Nee, alleen vooruit |
| `stroom.js` | Getijstroom | 12-09 01:20 t/m 20-09 07:00 UTC | `gen-stroom.mjs` | elke nacht 02:20 UTC | Nee, alleen vooruit |

Geteld door elk bestand in te lezen en de tijdstempels te sorteren.

### `meting.js` in detail

Vorm: `KWM.stations["hoekvanholland"].uren` is een **lijst**, geen object. Elke
regel is `[tijdstempel in UTC, knopen, graden waarvandaan]`.

| Wat | Getal |
|---|---|
| Meetpalen in het bestand | 28 |
| Spots die een paal toegewezen krijgen | 63 |
| Uurregels totaal | 504 |
| Uren per paal | 18 bij alle 28, geen enkele uitzondering |
| Gaten binnen die 18 uur | 0 |
| Regels zonder windrichting | 0 |

Geteld met een scriptje dat per paal de tijdstempels sorteert en de sprongen
groter dan een uur optelt.

### Wat de git-geschiedenis oplevert

Alle 33 versies van `meting.js` uitgelezen en de uren op een hoop gegooid:

| Wat | Getal |
|---|---|
| Versies in de geschiedenis | 33, allemaal leesbaar |
| Unieke uren, over alle palen | 41 |
| Eerste uur | 10-09-2026 19:00 UTC |
| Laatste uur | 12-09-2026 11:00 UTC |
| Spanwijdte | **1,7 dag** |
| Gemiddeld per paal | 40,4 uur |
| Hoek van Holland | 40 uur, 0 gaten |

De VPS ververst sinds 12-09, daarvoor deed GitHub het. Dat verklaart waarom er
niet meer in zit: de reeks begint gewoon niet eerder.

`uur.js` heeft 12 opgeslagen versies (7 op 06-09, 4 op 11-09, 1 op 12-09),
`stroom.js` 7 (6 op 11-09, 1 op 12-09). Beide zijn voorspellingen die elke nacht
volledig worden overschreven, dus die versies geven geen reeks van wat er gebeurd
is, alleen een handvol momentopnames van wat er verwacht werd.

### `uur.js`: vier spots, en de fijne modellen zijn half leeg

Het bestand is 168 KB, maar dekt **4 spots**: Zandmotor, Wassenaar, Noordpier,
Kijkduin. De andere 59 spots op de pagina hebben geen eigen voorspelling.

Gevulde uren van de 168, gemeten op Zandmotor:

| Model | Gevulde uren | Waarom |
|---|---|---|
| KNMI Harmonie 2 km | 67 | horizon 2,5 dag |
| AROME-HD 1,3 km | 57 | horizon 2 dagen |
| UKV 2 km | 57 | horizon 2 dagen |
| ICON-D2 2 km | 54 | horizon 2 dagen |
| ARPEGE 5 km | 105 | horizon 4 dagen |
| ECMWF, GFS, ICON, JMA, GEM | 168 elk | volle 7 dagen |

Geteld door per model de regels zonder waarde af te trekken.

## 2. Hoe ver reiken de externe bronnen echt?

### KNMI uurgegevens: jaren terug, maar twee dagen vertraging

Een verzoek voor 12-09-2020 geeft gewoon 144 regels terug. Er is geen bodem
gevonden. Maar het **laatste beschikbare etmaal is 10-09-2026**: 11-09 geeft nul
regels. Reken op twee dagen vertraging.

Over de laatste 120 etmalen (14-05 t/m 10-09-2026, dus 2.880 uren per station),
één verzoek per station, dubbele regels eruit gefilterd:

| nr | Station | Uren met wind | Ontbrekend | Oordeel |
|---|---|---|---|---|
| 225 | IJmuiden | 2.880 | 0 | compleet |
| 235 | De Kooy | 2.880 | 0 | compleet |
| 343 | Geulhaven | 2.880 | 0 | compleet |
| 215 | Voorschoten | 2.880 | 0 | compleet |
| 344 | Rotterdam | 2.880 | 0 | compleet |
| 330 | **Hoek van Holland** | 2.403 | **477** | **16,6 procent weg** |
| 257 | Wijk aan Zee | 0 | 2.880 | geeft regels, maar alle waarden leeg |
| 210 | Valkenburg | 0 | 2.880 | geeft niets terug |
| 320 | LE Goeree | 0 | 2.880 | geeft niets terug |
| 321 | Europlatform | 0 | 2.880 | geeft niets terug |

Wat `docs/dajk-mix.md` beweert over de laatste vier klopt precies: 257, 210, 320
en 321 leveren geen wind. 343 en 344 leveren die wel.

**Hoek van Holland is het ijkstation, en juist dat station heeft de gaten.**
Het zijn twee aaneengesloten uitvallen, geen ruis:

| Van | Tot | Uren weg |
|---|---|---|
| 14-05 01:00 | 28-05 10:00 | 346 |
| **21-08 01:00** | **26-08 11:00** | **131** |

Per maand: mei 346 van 432 weg, juni 0, juli 0, augustus 131 van 744, september 0.

Dat tweede gat valt vier dagen voor Daniels sessie van 30-08. Het raakt de vier
sessies dus net niet, maar wie een periode van twee weken rond eind augustus wil
toetsen, moet IJmuiden erbij pakken of MATROOS gebruiken.

### Open-Meteo previous-runs: dag 1 bestaat, dag 2 tot 7 niet, voor de fijne modellen

60 dagen opgevraagd op Hoek van Holland, dat is 1.440 uren per dag-vooruit.
Getal = hoeveel van die 1.440 uren een waarde hebben.

| Model | dag 1 | dag 2 | dag 3 | dag 4 | dag 5 | dag 6 | dag 7 |
|---|---|---|---|---|---|---|---|
| KNMI Harmonie 2 km | 1.440 | 0 | 0 | 0 | 0 | 0 | 0 |
| ICON-D2 2 km | 1.440 | 0 | 0 | 0 | 0 | 0 | 0 |
| UKV 2 km | 1.440 | 0 | 0 | 0 | 0 | 0 | 0 |
| AROME-HD 1,3 km | **855** | 0 | 0 | 0 | 0 | 0 | 0 |
| ECMWF 9 km | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 |
| GFS 13 km | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 |
| JMA 10 km | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 |
| GEM 15 km | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 |
| ICON 7 km | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | 1.440 | **0** |
| ARPEGE 5 km | 855 | 828 | 804 | 0 | 0 | 0 | 0 |

Dit bevestigt wat je al wist: de drie eerste fijne modellen zijn vol op dag 1,
AROME-HD zit op 59 procent (855 van 1.440, hetzelfde aandeel als jouw 877 van
1.464), en dag 2 is voor alle vier leeg.

Wat dat betekent voor de toets: **de vier fijne modellen kun je alleen toetsen op
"gisteren voorspeld, vandaag gebeurd".** De vraag "hoe goed is Harmonie drie dagen
vooruit" is met dit archief niet te beantwoorden. De grove modellen kun je wel
over de hele week toetsen, behalve ICON op dag 7.

### Rijkswaterstaat MATROOS: wind twee jaar terug, stroom vier weken

Zo aangeroepen als `gen-meting.mjs` en `gen-stroom.mjs` het doen, steeds een
venster van 24 uur op steeds verdere afstand in het verleden.

Wind (`db=series`, `source=observed`, paal Hoek van Holland):

| Hoe ver terug | Meetpunten in 24 uur |
|---|---|
| 1 dag | 144 |
| 7 dagen | 144 |
| 30 dagen | 144 |
| 90 dagen | 144 |
| 180 dagen | 144 |
| 1 jaar | 144 |
| **2 jaar** | **144** |

144 punten per etmaal is precies elke 10 minuten, zonder gaten, ook twee jaar
terug. Geen bodem gevonden. **Dit is de langste bruikbare meetreeks die bestaat,
en hij is gratis en zonder sleutel op te halen.**

Getijstroom (`db=maps1d`, `source=dcsm_fm05nm_astro`, punt Katwijk):

| Hoe ver terug | Antwoord |
|---|---|
| 1 t/m 25 dagen | 144 punten, compleet |
| 28 dagen | "There is no data available" |
| 30 dagen | idem |
| 45 dagen en verder | idem |

De stroomarchiefdeur gaat dus rond de **26 dagen** dicht. Wie stroom in de toets
wil meenemen, kan niet verder terug dan vier weken, tenzij hij nu begint met
wegschrijven. Let ook op wat er in zit: alleen het astronomische getij, dus de
stand van maan en zon. De extra stroming die de wind zelf opwekt zit er niet in.

## 3. De grondwaarheid: vier sessies

In `ijk.mjs` staan ze, en dit is het enige in het hele project dat vastlegt hoe
het *voelde* in plaats van wat een paal mat.

| Dag | Wind | Vlaag | Kite | Board | Wat Daniel zei |
|---|---|---|---|---|---|
| zo 30-08 | 19 kn | 31 kn | 10 m | twintip | well powered |
| ma 31-08 | 23 kn | 30 kn | 10 m | twintip | well powered |
| vr 04-09 | 24 kn | 30 kn | 8 m | directional | nicely powered |
| zo 07-09 | 17 kn | 24 kn | 13 m | twintip | kon net, ondergrens, cijfer hoogstens 7 |

Alles bij 85 kg. De wind van 07-09 is zelf al een schatting: zijn Garmin gaf tijd
en plek (Wassenaar, 19:08 tot 20:27), de wind komt uit de palen ernaast, Hoek van
Holland 16,6 kn en IJmuiden 19,2, en daar is 17 uit gerekend.

**Hoe mager dit is, eerlijk:**

- Vier sessies. Drie ervan binnen negen dagen.
- Twee maanden: augustus en september 2026. Geen winter, geen voorjaar.
- Windband 17 tot 24 knopen. Vier punten binnen zeven knopen.
- **Niets onder 17 kn.** De ondergrens rust op één sessie, en die met een geschat windgetal.
- **Niets boven 24 kn.** De hele bovenkant van de schaal, waar de pagina 30 en 40 kn als grens hanteert, is met nul sessies gestaafd.
- Eén sessie op een directional. De correctie voor dat board hangt aan dat ene punt.
- Vlaagverhouding altijd tussen 1,3 en 1,6. De vlaaggrens staat op 1,8, dus geen enkele sessie toetst hem van de andere kant.

Zeven van de acht grenzen in `ijk.mjs` zijn dus niet gemeten maar geoordeeld.

## 4. De tijdzone-val, uitgeschreven

Drie bronnen, drie manieren van tijd opschrijven. Wie ze niet gelijkzet,
vergelijkt twee verschillende uren en krijgt een fout van precies twee uur.

| Bron | Hoe de tijd erin staat | Voorbeeld |
|---|---|---|
| `meting.js` | UTC, met een Z erachter | `"2026-09-12T10:00Z"` |
| KNMI uurgegevens | `date` plus `hour` 1 tot 24, in UTC, en het uur *eindigt* op dat nummer | `date: 2026-09-10, hour: 13` |
| Open-Meteo in `gen-uur.mjs` | lokale tijd, zonder achtervoegsel, want er wordt `timezone=Europe/Amsterdam` gevraagd | `"2026-09-12T12:00"` |
| De pagina zelf | lokale tijd van de browser, in de zomer UTC+2 | `12:00` |

Het valstrikje zit in het woord *eindigt*. KNMI `hour: 13` is het gemiddelde over
12:00 tot 13:00 UTC. Als je dat uur een naam moet geven, is dat 12:00 UTC, niet
13:00.

**Eén concreet uur, helemaal doorgerekend.** Neem het uur dat op de pagina
"12:00" heet, op 10 september 2026:

| Stap | Waarde |
|---|---|
| De pagina toont | 12:00 lokaal (CEST) |
| Lokaal min twee uur | 10:00 UTC |
| In `meting.js` zoek je | `"2026-09-10T10:00Z"` |
| Bij KNMI zoek je | `date` 2026-09-10, **`hour` 11** (want 10:00 tot 11:00 UTC) |
| In `uur.js` zoek je | `"2026-09-10T12:00"`, want dat bestand staat al in lokale tijd |

Zo doet `verifieer.mjs` het ook: hij pakt `hour - 1`, leest dat als UTC, telt er
twee uur bij op en gebruikt die lokale tijd als sleutel.

Nog twee dingen die ernaast fout gaan:

- KNMI geeft wind in tienden van een meter per seconde. `FH: 40` is 4,0 m/s is 7,8 knopen. Rekenen met 40 geeft onzin.
- In de winter is de sprong één uur, niet twee. Wie een toets over meerdere maanden doet, moet dus niet blind plus twee doen maar de echte omrekening gebruiken.

## Antwoord op: is de data compleet?

**Nee.**

Wat er is: 18 uur aan echte metingen in het bestand, 1,7 dag als je de hele
git-geschiedenis uitkamt. Dat is geen basis om een model op te toetsen.

Wat er kan zijn, en dat is het goede nieuws: MATROOS geeft dezelfde palen die de
pagina al gebruikt **twee jaar terug**, elke 10 minuten, zonder gaten en zonder
sleutel. KNMI geeft er nog veel meer, met twee dagen vertraging. Eén keer
ophalen en wegschrijven en de toets heeft materiaal genoeg.

**De belangrijkste beperking, ook na dat ophalen:** van de vier fijne modellen
bestaat alleen de voorspelling van één dag vooruit. Dag 2 tot en met 7 is leeg
en komt ook niet meer. En de grondwaarheid over hoe het voelde blijft vier
sessies, allemaal tussen 17 en 24 knopen, allemaal in augustus en september. Een
toets kan dus hard maken hoe goed een model de wind raadt, maar niet of het
cijfer dat de pagina eraan hangt klopt buiten die smalle band.
