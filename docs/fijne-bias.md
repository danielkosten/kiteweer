# Lezen de fijne modellen te laag? De meting

Meetscript: `toets-fijn.mjs` in de root, `node toets-fijn.mjs`, geen sleutel nodig.
Dit is een meting, geen wijziging aan de site. Alle getallen hieronder komen uit die run.

**Periode** 14-07-2026 t/m 10-09-2026, 3228 gekoppelde uren, daglicht 07-20 lokale tijd.
**Voorspelling** Open-Meteo previous-runs, dag 1 (verder terug bewaart het archief de fijne modellen niet).
**Meting** KNMI uurgegevens, FH is de uurgemiddelde wind, DD de richting.
**Bias** is model min meting in knopen. Negatief betekent: het model leest te laag.
**Fout** is de gemiddelde absolute fout, de gemiddelde misser ongeacht welke kant op.

## 1. Ja, het is structureel, maar niet overal even hard

bias / fout (aantal uren)

| model | IJmuiden pier | Hoek van Holland pier | Geulhaven haven | De Kooy landmast |
|---|---|---|---|---|
| AROME-HD 1,3 km | +0,3 / 2,8 (486) | -0,9 / 2,4 (410) | -1,1 / 2,2 (486) | +0,6 / 2,0 (486) |
| ICON-D2 2 km | -3,3 / 3,9 (826) | -1,0 / 2,4 (750) | -2,2 / 2,7 (826) | +1,0 / 2,1 (826) |
| UKV 2 km | -4,0 / 4,5 (826) | -0,8 / 2,5 (750) | -2,4 / 2,8 (826) | 0,0 / 2,1 (826) |
| KNMI Harmonie 2 km | -4,3 / 4,6 (826) | -2,2 / 3,0 (750) | -1,3 / 2,2 (826) | +0,4 / 2,2 (826) |
| **fijne mix** | **-3,2 / 3,8 (826)** | **-1,3 / 2,3 (750)** | **-1,6 / 2,3 (826)** | **+0,6 / 1,8 (826)** |

Over alle stations samen: AROME-HD -0,2, ICON-D2 -1,4, UKV -1,8, KNMI Harmonie -1,9, mix -1,4.

Het beeld is hetzelfde als bij de grove modellen, alleen veel zachter: aan het water te laag, op
land goed. Maar de -2,7 tot -3,1 van 12-09 blijkt geen kustbreed getal. Op IJmuiden klopt hij
(-3,2), op Hoek van Holland is hij minder dan de helft daarvan (-1,3).

AROME-HD valt op: hij leest als enige nergens structureel laag. Op dezelfde uren gemeten (hij heeft
gaten, zie onder) is hij op IJmuiden +0,3 waar ICON-D2, UKV en KNMI op -3,5 tot -4,4 zitten.

## 2. Nee, de afwijking is niet vlak. Hij groeit met de wind mee

Fijne mix, gesplitst op de **gemeten** wind. Piers (IJmuiden en Hoek van Holland samen):

| gemeten wind | < 10 | 10-14 | 14-20 | 20-25 | > 25 |
|---|---|---|---|---|---|
| bias | -0,3 | -2,4 | -3,4 | -5,6 | -8,0 |
| fout | 1,9 | 2,8 | 3,6 | 5,7 | 8,1 |
| uren | 592 | 383 | 446 | 106 | 49 |

Spreiding 7,7 kn tussen de laagste en de hoogste band. Dat is het tegendeel van vlak. Bij zwakke
wind klopt de mix, bij harde wind zit hij er 8 kn naast. Een vaste optelling is daarmee moeilijk te
verdedigen: hij plust de rustige uren omhoog waar niets mis was, en redt de harde uren niet.

Wat de twee correcties overlaten, piers, rest-bias per band:

| correctie | < 10 | 10-14 | 14-20 | 20-25 | > 25 | fout over alles |
|---|---|---|---|---|---|---|
| geen | -0,3 | -2,4 | -3,4 | -5,6 | -8,0 | 3,06 |
| optelling +2,1 kn | +1,8 | -0,3 | -1,3 | -3,5 | -5,9 | 2,42 |
| vermenigvuldiging x1,20 | +1,1 | -0,4 | -0,6 | -2,3 | -4,2 | **2,44** |

Op de gemiddelde fout is het gelijkspel (2,42 tegen 2,44). Op vorm wint de vermenigvuldiging
duidelijk: in de band 14-20, precies de band waar de pagina "genoeg wind" zegt, blijft -0,6 over
in plaats van -1,3, en bij zwakke wind schiet hij minder ver door (+1,1 tegen +1,8). Een
vermenigvuldiging doet wat de fout doet: meegroeien.

Per station, de beste correctie die er is:

| station | fout ruw | beste optelling | fout daarna | beste factor | fout daarna |
|---|---|---|---|---|---|
| IJmuiden pier | 3,77 | +3,2 kn | 2,56 | x1,32 | **2,37** |
| Hoek van Holland pier | 2,27 | +1,3 kn | **1,97** | x1,10 | 2,02 |
| Geulhaven haven | 2,29 | +1,7 kn | 1,81 | x1,19 | **1,78** |
| De Kooy landmast | 1,81 | +0,0 kn | 1,81 | x1,00 | 1,81 |

De Kooy vraagt letterlijk nul. Iedere correctie maakt het daar slechter.

## 3. De richting doet er nauwelijks toe

Fijne mix, gesplitst op de gemeten richting in vakken van 45 graden. Piers:

| sector | N-NO | NO-O | O-ZO | ZO-Z | Z-ZW | ZW-W | W-NW | NW-N |
|---|---|---|---|---|---|---|---|---|
| bias | -2,5 | -3,7 | -2,1 | -1,6 | -2,4 | -2,7 | -1,9 | -1,9 |
| uren | 130 | 129 | 105 | 53 | 183 | 282 | 308 | 327 |

Samengevoegd: aanlandig (wind van zee, ruwweg 180-360 graden) -2,2 kn over 1154 uren, aflandig
(0-180) -2,6 kn over 417 uren. Dat verschil is kleiner dan de spreiding tussen de sectoren zelf.
Conclusie: geen richtingsafhankelijke correctie. De enige uitschieter is NO-O met -3,7, en dat zijn
maar 129 uren.

## 4. Pier tegen landmast: het hele verhaal zit daar

Fijne mix:

| soort | station | uren | bias | fout |
|---|---|---|---|---|
| pier | IJmuiden, Hoek van Holland | 1576 | -2,3 | 3,1 |
| haven | Geulhaven | 826 | -1,6 | 2,3 |
| landmast | De Kooy | 826 | **+0,6** | 1,8 |

Zelfde modellen, zelfde dagen, zelfde uren. Op land leest de fijne mix goed, zelfs een tikje te
hoog. Aan het water te laag. Geulhaven, een havenstation dat half beschut ligt, zit er precies
tussenin. Dat is dezelfde lijn als bij de grove modellen (`docs/dajk-mix.md`), alleen 1,5 tot 2 kn
zachter: 2 km-cellen vangen de overgang land-zee beter dan een cel van 13 km, maar niet helemaal.

Dit is ook waarom een ranglijst op alleen pierstations niets waard is: een model dat structureel
harder blaast wint daar zonder beter te zijn.

## 5. De fijne mix, het getal dat er echt toe doet

De mix is de gewogen middelste waarde van de vier, met Arthurs skill-gewichten (AROME-HD 1,16,
ICON-D2 1,03, UKV 0,93, KNMI Harmonie 0,88), precies zoals `gen-uur.mjs` het doet.

| station | uren | bias | fout | fout na de eigen optelling |
|---|---|---|---|---|
| IJmuiden pier | 826 | -3,2 | 3,8 | 2,6 |
| Hoek van Holland pier | 750 | -1,3 | 2,3 | 2,0 |
| Geulhaven haven | 826 | -1,6 | 2,3 | 1,8 |
| De Kooy landmast | 826 | +0,6 | 1,8 | 1,8 |

De mix is beter dan het gemiddelde van zijn onderdelen (fout 1,8 tot 3,8 tegen 2,0 tot 4,6 voor de
losse modellen), maar hij erft de bias van de drie modellen die te laag lezen. AROME-HD, het enige
model dat waar leest, wordt overstemd doordat hij op 1868 van de 3228 uren ontbreekt.

## 6. Wat het kost aan de ondergrens van 14 kn

Heidke Skill Score: hoeveel beter dan gokken, 0 is gokken, 1 is perfect. Drempel "14 kn of meer",
de grens die de pagina gebruikt voor genoeg wind.

| | uren | kitebare uren echt | HSS | raak | gemist | vals alarm |
|---|---|---|---|---|---|---|
| piers, ruw | 1576 | 601 | 0,58 | 342 | **259** | 27 |
| piers, +2,1 kn | 1576 | 601 | 0,70 | 490 | 111 | 114 |
| piers, x1,20 | 1576 | 601 | **0,70** | 500 | **101** | 122 |
| IJmuiden, ruw | 826 | 322 | 0,44 | 128 | **194** | 4 |
| IJmuiden, x1,20 | 826 | 322 | 0,71 | 249 | 73 | 37 |
| Hoek van Holland, ruw | 750 | 279 | 0,74 | 214 | 65 | 23 |
| Hoek van Holland, x1,20 | 750 | 279 | 0,69 | 251 | 28 | 85 |
| Geulhaven, ruw | 826 | 108 | 0,38 | 30 | **78** | 5 |
| Geulhaven, x1,20 | 826 | 108 | 0,66 | 81 | 27 | 39 |
| De Kooy, ruw | 826 | 98 | 0,63 | 84 | 14 | 63 |
| De Kooy, x1,20 | 826 | 98 | **0,40** | 95 | 3 | **183** |

**Het getal dat pijn doet:** op de piers mist de huidige fijne mix 259 van de 601 kitebare uren,
43 procent. Op IJmuiden 194 van de 322, 60 procent. Daar staat vrijwel geen vals alarm tegenover
(27 op de piers, 4 op IJmuiden): de mix is niet onzeker, hij is te voorzichtig. Met x1,20 zakt het
missen op de piers naar 101 uren (17 procent) en loopt het vals alarm op naar 122. Dat is een
ruil waar je 158 kitebare uren terugkrijgt voor 95 keer voor niets kijken.

En De Kooy laat zien wat er gebeurt als je die factor op een landplek loslaat: het vals alarm
verdrievoudigt naar 183 uren en de score valt terug naar 0,40, slechter dan zonder correctie.

## Wat je niet uit deze meting mag halen

- **Zomer, 59 dagen.** 14-07 t/m 10-09. Zomer aan de kust betekent zeewind door het
  land-zeeverschil in temperatuur, precies het verschijnsel waar een model op struikelt. Een
  winterse storm kan een heel ander getal geven. Nameten na de winter.
- **Vier stations, en maar één daarvan is een landmast.** De hele conclusie "op land klopt het"
  hangt aan De Kooy alleen.
- **Model op station, niet op spot.** Er wordt een voorspelling voor de coordinaten van de meetpaal
  gehaald en vergeleken met die paal. De spots van de pagina (Zandmotor, Wassenaar, Noordpier,
  Kijkduin) zijn stranden, geen piers en geen landmasten. Dat een strand zich als de pier gedraagt
  is overgenomen uit `docs/dajk-mix.md` (Daniels eigen sessies), niet hier opnieuw gemeten.
- **AROME-HD heeft gaten.** 1868 van de 3228 uren, 58 procent. Zijn bias staat daarom op minder
  uren dan de andere drie. Tabel 7 van het script rekent alle vier op alleen de gedeelde uren door,
  en daar blijft het beeld staan, maar het blijft een kleinere steekproef.
- **Alleen dag 1.** Het previous-runs-archief bewaart de fijne modellen niet verder terug
  (`previous_day2` is leeg voor alle vier). De pagina gebruikt ze op dag 0 tot 2,5, dus de laatste
  anderhalve dag van hun bereik is hier niet gemeten en is vermoedelijk slechter.
- **Bias is geen fysica.** Dat een model 3 kn te laag leest zegt niet waarom. Een optelling of
  factor plakt over het gat heen, hij lost het niet op.
- **De optellingen en factoren zijn op dezelfde data gekozen als waarop ze getoetst zijn.** Ze
  zien er dus iets beter uit dan ze op een nieuwe zomer zullen doen.

## Aanbeveling

**Ja, er moet een correctie op de fijne klasse komen, en het moet een vermenigvuldiging zijn, niet
een optelling. Niet overal hetzelfde, maar alleen op de kustspots.**

1. **Vermenigvuldigen, niet optellen.** De bias is niet vlak: hij loopt van -0,3 kn bij zwakke wind
   naar -8,0 kn boven de 25 kn. Op de gemiddelde fout doen de twee even veel (2,42 tegen 2,44),
   maar de factor laat in de band die er voor kiten toe doet (14-20 kn) -0,6 over waar de optelling
   -1,3 laat, en hij tilt rustige uren minder onterecht omhoog (+1,1 tegen +1,8).
2. **x1,20 voor de kustspots.** Dat is de beste factor voor de piers samen. Hij brengt de fout daar
   van 3,06 naar 2,44 en de score op "14 kn of meer" van 0,58 naar 0,70, en hij haalt 158 van de
   259 gemiste kitebare uren terug.
3. **Per spot afstemmen kan niet met vier stations.** De beste factor loopt van x1,10 op Hoek van
   Holland tot x1,32 op IJmuiden. Dat is een echt verschil, en het past bij de bekende lijn dat de
   Noordpier harder is dan de Zandmotor. Maar het is één zomer en twee piers: één x1,20 voor de
   hele kust is nu eerlijker dan vier verzonnen spotgetallen. Kijk hier opnieuw naar zodra er een
   tweede seizoen data is.
4. **Niet toepassen op een landplek.** x1,20 op De Kooy verlaagt de score van 0,63 naar 0,40 en
   verdrievoudigt het vals alarm. De correctie hoort bij het water, niet bij het model als zodanig.
5. **Los hiervan: geef AROME-HD zijn stem terug.** Hij is het enige fijne model dat waar leest
   (bias -0,2 over alles, +0,3 op IJmuiden waar de andere drie -3,5 tot -4,4 zitten) en hij
   ontbreekt op 42 procent van de uren. Dat de mix te laag leest komt voor een flink deel doordat
   uitgerekend het goede model er vaak niet is. Als er een dag komt waarop AROME-HD er wel is, is
   de correctie te groot. Dat is een aparte meting waard voor de factor vast wordt gezet.

Geen correctie op de richting: aanlandig -2,2 tegen aflandig -2,6 is te klein om iets mee te doen.
