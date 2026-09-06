# DAJK-mix: de mix per dag vooruit, gemeten

Voor Arthur. Wat de pagina sinds 2026-09-06 standaard doet, waarom, en hoe het gemeten is.
Meetscript: `toets-horizon.mjs` in de root, `node toets-horizon.mjs`, geen sleutel nodig.

## Wat het is

Zelfde rekenkern als de site (gewogen middelste waarde, elk model één stem, jouw skill-gewichten
binnen de fijne klasse). Drie toevoegingen, alle drie uit meting:

| dag vooruit | wind = | verschil met DAJK-oud |
|---|---|---|
| 0 – 2,5 | middelste van de 4 fijne modellen | geen |
| 2,5 – 4 | middelste van ARPEGE + de 5 grove modellen, grof eerst **+3 kn** (Noordpier +4) | ARPEGE erbij, optelling |
| 4 – 7 | middelste van de 5 grove modellen +3 kn | JMA en GEM erbij, optelling |
| 3 – 7 | ernaast: kans op kitewind uit 31 GFS-runs en 51 ECMWF-runs, na dezelfde optelling | nieuw |

Grove modellen: ECMWF 9 km, GFS, ICON, JMA, GEM. De 25 km-versie van ECMWF is weg.

## Waarom: de grove modellen lezen aan het water 3–5 kn te laag

60 dagen (08-07 t/m 06-09), Open-Meteo previous-runs API tegen KNMI-uurwind, daglicht 07–20.
Bias van de grove modellen, gemiddeld over dag 1–7:

| station | soort | ECMWF 9 km | GFS | ICON | JMA | GEM |
|---|---|---|---|---|---|---|
| Hoek van Holland 330 | pier | -4,2 | -3,4 | -3,5 | -2,2 | -2,9 |
| IJmuiden 225 | pier | -5,6 | -4,4 | -4,5 | -3,4 | -3,6 |
| De Kooy 235 | landmast | -0,1 | +0,9 | +0,2 | +2,4 | +1,2 |

Zelfde modellen, zelfde dagen. Op land kloppen ze, aan het water niet. Een 13 km-cel op de kust is
half land, en land remt. Daniels drie sessies (30-08, 31-08, 04-09) zeiden hetzelfde: grof 8–10 kn
te laag op het strand, fijn in de pas. Dus het strand gedraagt zich als de pier, niet als De Kooy.

Gevolg voor jouw meting: een model dat op een pier "beter" scoort kan gewoon harder blazen. JMA en
GEM winnen op de piers en schieten op De Kooy +1 tot +2,5 door. Ranglijsten op één soort station
belonen bias. Daarom hier altijd pier én landmast naast elkaar.

## Waarom ARPEGE

Météo-France, globaal model op een gerekt rooster: ~5 km boven Frankrijk en de omliggende zeeën,
grover aan de andere kant van de aarde. Onze kust ligt in het fijne deel. AROME (jouw hoogste
gewicht) neemt zijn randen van ARPEGE. Reikt 4 dagen, dat is waarom hij bij jou buiten de boot viel.

Bias op de piers -0,2 tot -0,8: hij leest waar, krijgt dus geen optelling. HSS op "≥14 kn":

| | dag 1 | dag 2 | dag 3 |
|---|---|---|---|
| ARPEGE, Hoek van Holland | 0,77 | 0,75 | 0,61 |
| ARPEGE, IJmuiden | 0,63 | 0,56 | 0,54 |
| fijne mix, Hoek van Holland | 0,69 | – | – |
| beste ander grof model, Hoek van Holland | 0,47 (JMA) | 0,45 | 0,44 |

Op De Kooy overschat hij vanaf dag 2 (+2,8). Aan het water is hij het beste model tot dag 3, ook
beter dan de fijne mix op dag 1. In de mix telt hij één stem, gewicht 1, niets bijzonders.

## Resultaat: DAJK-oud tegen DAJK-mix (en AJK)

HSS op "≥14 kn", daglicht, 60 dagen. 0 = gokken, 1 = perfect.

| | d1 | d2 | d3 | d4 | d5 | d6 | d7 |
|---|---|---|---|---|---|---|---|
| Hoek van Holland, AJK | 0,50 | 0,22 | 0,23 | 0,27 | 0,21 | 0,18 | 0,11 |
| Hoek van Holland, DAJK-oud | 0,69 | 0,22 | 0,23 | 0,27 | 0,21 | 0,18 | 0,11 |
| Hoek van Holland, DAJK-mix | 0,69 | **0,61** | **0,58** | **0,48** | **0,51** | **0,43** | **0,29** |
| IJmuiden, AJK | 0,20 | 0,16 | 0,14 | 0,19 | 0,09 | 0,06 | 0,07 |
| IJmuiden, DAJK-oud | 0,27 | 0,16 | 0,14 | 0,19 | 0,09 | 0,06 | 0,07 |
| IJmuiden, DAJK-mix | 0,27 | **0,62** | **0,60** | **0,56** | **0,50** | **0,34** | **0,31** |
| De Kooy, DAJK-oud | 0,57 | 0,62 | 0,51 | 0,42 | 0,35 | 0,20 | 0,08 |
| De Kooy, DAJK-mix (optelling 0) | 0,57 | 0,58 | 0,48 | 0,43 | 0,33 | 0,23 | 0,02 |

AJK en DAJK-oud zijn vanaf dag 2,5 hetzelfde getal: zodra de fijne modellen wegvallen blijft in
beide alleen de grove middelste waarde over. Op dag 1 trekt AJK de fijne mix 1,2 kn omlaag door de
grove helft. Wat de AJK-mix van de site bij Arthur écht doet (ensembles, kans-%) is hier niet
gemeten: die leden zitten niet in het archief.

Gemiddelde fout Hoek van Holland dag 2–6: 4,2–4,7 kn naar 2,6–3,5 kn. Bias van -3,8 naar -0,3.

Eerlijk: op De Kooy wint het niets, iets meer vals alarm zelfs. De winst zit aan het water, waar
wij kiten. Dag 1 is ongewijzigd, want daar reiken de fijne modellen. Dag 7 blijft slecht in alles.

Besluiten met grond en status: `docs/adr/`.

## Wat je niet uit deze meting mag halen

- **Zomer, 60 dagen, 3 stations.** De +3 is een zomergetal. Nameten na een winter.
- **Model op station, niet op spot.** Zelfde aanname als jouw HSS-meting.
- **Dag 1 fijn ontbreekt AROME-HD**: die zit niet in het previous-runs-archief (jouw research 05).
- **De ensembles zijn niet te toetsen**: het archief bewaart geen leden. De kans staat erbij als
  hint, nooit als oordeel. Twee kansen ver uiteen = de modellen zijn het niet eens.
- **IJmuiden dag 1**: ook de fijne mix leest daar 3,8 kn te laag. Optelling op de fijne klasse voor
  Noordpier is de volgende meting.

## Stations die wind leveren via daggegevens.knmi.nl

330 Hoek van Holland, 225 IJmuiden, 235 De Kooy, 343 Geulhaven, 215 Voorschoten, 344 Rotterdam.
Géén data: 257 Wijk aan Zee, 210 Valkenburg, 320 LE Goeree, 321 Europlatform.
