# Lezen de fijne modellen te laag? De meting over 3,5 jaar

Meetscript: `toets-lang.mjs` in de root, `node toets-lang.mjs`, geen sleutel nodig.
Dit is een meting, geen wijziging aan de site. Elk getal hieronder komt uit die run.

**Periode** 01-01-2023 t/m 10-09-2026, 96.329 gekoppelde uren, vier winters.
**Voorspelling** Open-Meteo historical-forecast-api, het archief van wat de modellen destijds zeiden.
**Meting** KNMI uurgegevens. FH is de gemiddelde wind over dat uur, FX de hoogste vlaag erin.
**Fijne mix** de gewogen middelste waarde van AROME-HD (1,16), ICON-D2 (1,03), UKV (0,93) en KNMI Harmonie (0,88), net als de pagina.
**Verhouding** gemeten wind gedeeld door de mix. 1,10 betekent: het model leest 10% te laag.

## Het korte antwoord

De bewering dat 40 kn op de pagina in het echt rond 47 ligt, klopt niet. Gemeten op Hoek van Holland:
als de mix 26 tot 30 zegt, is de middelste echte meting 29,2 kn; zegt hij 30 tot 35, dan is het 33,0.
De verhouding is daar 1,02 tot 1,03, niet 1,18. De mix zei in 3,5 jaar geen enkel uur 40 of meer op
Hoek van Holland. De winter wijkt niet af van de zomer. Aanbeveling: de grenzen van 30 en 40 laten staan.

## Waarom er twee verhoudingen zijn, en welke telt

Dit is de val waar de 60-daagse meting in liep, en hij verklaart het hele verschil.

| je sorteert op | je vraagt | Hoek van Holland, hoge wind |
|---|---|---|
| de **gemeten** wind | het woei 30, wat zei het model? | verhouding 1,13 tot 1,16 |
| de **modelwaarde** | het model zei 30, wat woei er? | verhouding 1,02 tot 1,03 |

Sorteer je op wat er gemeten is, dan pak je per definitie de uren waarop het model er het verst
naast zat; het model moet die uren wel gemist hebben, anders hadden ze niet in die band gestaan.
Dat blaast de verhouding op. De paginalezer ziet die richting nooit. Hij ziet een getal op het
scherm en wil weten wat daar buiten staat. Dat is de tweede rij, en die is veel milder.

## 1. Hoe vaak komt elke windband voor

Alle uren, op de gemeten wind. Aantal uren en het aandeel van alle uren.

| station | totaal | < 10 | 10-14 | 14-18 | 18-22 | 22-26 | 26-30 | 30-35 | 35-40 | 40+ |
|---|---|---|---|---|---|---|---|---|---|---|
| Hoek van Holland | 31.843 | 38,61% | 22,98% | 18,75% | 11,39% | 5,38% | 2,09% | 0,72% | 0,07% | 0,01% |
| IJmuiden | 32.115 | 37,59% | 21,99% | 16,57% | 10,86% | 6,79% | 3,62% | 2,06% | 0,40% | 0,13% |
| De Kooy | 32.371 | 59,10% | 21,02% | 11,92% | 5,39% | 1,77% | 0,64% | 0,14% | 0,02% | 0,00% |

In uren, zodat je ziet hoe dun de top is: Hoek van Holland heeft 228 uren in 30-35, 21 in 35-40 en
**4** in 40+. De Kooy heeft nul uren boven de 40. IJmuiden heeft er 41.

Daglicht 07-20 is niet anders van vorm, alleen iets winderiger: Hoek van Holland 124 uren in 30-35,
18 in 35-40, 4 in 40+; over de drie stations samen 33 daglichturen boven de 40 in 3,5 jaar.

## 2. De verhouding per band, met hoeveel uren en hoe zeker

Gesorteerd op de **gemeten** wind (de opgeblazen richting, zie boven). Tussen haken het gebied
waarin de echte waarde met 95% zekerheid ligt; n is het aantal uren.

| gemeten | Hoek van Holland | IJmuiden | De Kooy |
|---|---|---|---|
| < 10 | 1,099 [1,093;1,105] n11552 | 1,256 [1,250;1,263] n11134 | 0,908 [0,904;0,912] n18228 |
| 10-14 | 1,192 [1,186;1,198] n7310 | 1,401 [1,394;1,408] n7051 | 1,007 [1,002;1,011] n6803 |
| 14-18 | 1,185 [1,179;1,191] n5971 | 1,441 [1,433;1,448] n5318 | 1,040 [1,035;1,045] n3859 |
| 18-22 | 1,177 [1,170;1,183] n3628 | 1,425 [1,417;1,433] n3488 | 1,063 [1,056;1,070] n1746 |
| 22-26 | 1,160 [1,151;1,169] n1711 | 1,435 [1,427;1,444] n2181 | 1,080 [1,066;1,095] n573 |
| 26-30 | 1,153 [1,138;1,168] n666 | 1,462 [1,446;1,479] n1161 | 1,113 [1,086;1,139] n208 |
| 30-35 | 1,132 [1,115;1,149] n228 | 1,445 [1,429;1,460] n662 | 1,144 [1,105;1,183] n45 |
| 35-40 | 1,238 [1,134;1,342] n21 · te breed | 1,441 [1,404;1,477] n130 | 1,264 [1,133;1,394] n6 · te breed |
| 40+ | 1,302 [1,194;1,409] n4 · te breed | 1,484 [1,433;1,534] n41 | geen uren |

Te breed betekent: het interval is breder dan 0,15, dus die band bewijst niets.

Twee dingen springen eruit.

Op Hoek van Holland **daalt** de verhouding boven de 10 kn, van 1,19 naar 1,13 bij 30-35. Hij loopt
niet op naar 1,18 zoals de 60-daagse meting dacht. Die dacht dat op 21 uren zomerwind; hier staan
er 228 onder, verdeeld over vier jaar.

IJmuiden zit op 1,44 en dat is geen kustbreed getal, dat is dat ene roosterpunt. Het model leest
daar structureel een derde te laag, in elke band, ook bij windstilte. Reken IJmuiden en Hoek van
Holland niet samen: de "piers samen"-rij in de scriptuitvoer wordt door IJmuiden getrokken en zegt
weinig over de plek waar Daniel kite.

## 3. Losse stormen of structureel

Voor elke band vanaf 22 kn: hoeveel uren, op hoeveel verschillende dagen, in hoeveel aaneengesloten
periodes (een gat van meer dan 6 uur maakt er een nieuwe van), en welk aandeel de drie grootste
periodes samen leveren.

| Hoek van Holland | uren | dagen | periodes | top 3 samen | grootste bijdragers |
|---|---|---|---|---|---|
| 22-26 | 1713 | 341 | 333 | 4,73% | 27-12-2023, 30-12-2023, 04-02-2024 |
| 26-30 | 666 | 147 | 144 | 10,51% | 01-01-2026, 22-12-2023, 24-11-2024 |
| 30-35 | 228 | 53 | 48 | 22,81% | 04-10-2025, 15-09-2025, 21-12-2023 |
| 35-40 | 21 | 10 | 10 | 52,38% | 24-11-2023, 02-11-2023, 23-10-2025 |
| 40+ | 4 | 3 | 3 | 100% | 02-11-2023, 05-07-2023, 24-11-2023 |

Tot en met 30-35 is het structureel: 48 losse periodes over vier jaar, de grootste drie dragen een
vijfde. Vanaf 35 is het dat niet meer. De band 35-40 rust op 10 losse periodes en de helft van de
uren komt uit drie ervan; 40+ is drie losse uren uit drie stormen. IJmuiden is hetzelfde beeld, een
stap verder omhoog: 30-35 heeft daar 662 uren in 114 periodes, 40+ heeft 41 uren in 14 periodes
waarvan de top drie 39% levert.

## 4. Winter tegen zomer

Dit is de vraag waarvoor deze meting bestaat. Antwoord: nee, de winter wijkt niet af.

Hoek van Holland, verhouding winter (okt t/m mrt) tegen zomer:

| gemeten | winter | zomer | oordeel |
|---|---|---|---|
| 10-14 | 1,184 n3338 | 1,199 n3972 | overlap, geen verschil aantoonbaar |
| 14-18 | 1,172 n2856 | 1,197 n3115 | echt verschil, winter 0,025 lager |
| 18-22 | 1,166 n1960 | 1,189 n1668 | echt verschil, winter 0,023 lager |
| 22-26 | 1,156 n1139 | 1,168 n572 | overlap |
| 26-30 | 1,156 n505 | 1,142 n161 | overlap |
| 30-35 | 1,133 n179 | 1,129 n49 | overlap |
| 35-40 | 1,254 n19 | 1,081 n2 | intervallen te breed, zegt niets |

Waar een verschil aantoonbaar is, is het 0,02 tot 0,04 en leest de winter juist **iets minder** te
laag, niet meer. Per maand over beide piers samen loopt de verhouding van 1,238 (oktober) tot 1,283
(mei), met elke maand n boven 4200. Geen seizoenspatroon dat iets uitmaakt.

Belangrijk gevolg: de 60-daagse zomermeting was niet scheef doordat het zomer was. Wat er scheef
aan was, was de dunne top en de sorteerrichting uit hoofdstuk 2.

## 5. De twee grenzen van de pagina, direct gemeten

**Wat de lezer ziet.** Het model zegt X, wat werd er gemeten? Hoek van Holland.

| mix zegt | uren | middelste echte meting | verhouding |
|---|---|---|---|
| 14-18 | 5429 | 17,5 kn | 1,102 [1,097;1,106] |
| 18-22 | 2864 | 21,4 kn | 1,071 [1,066;1,076] |
| 22-26 | 1176 | 25,3 kn | 1,043 [1,036;1,050] |
| 26-30 | 443 | 29,2 kn | 1,024 [1,014;1,034] |
| 30-35 | 111 | 33,0 kn | 1,025 [1,006;1,043] |
| 35-40 | 6 | 35,0 kn | 0,993, interval te breed |
| 40+ | 0 | nooit voorgekomen | geen |

**Gemist.** Van de 253 uren waarop Hoek van Holland echt 30 of meer mat, zei de mix 161 keer minder
dan 30: 63,6% gemist. Van de 4 uren met 40 of meer zei hij alle 4 minder dan 40. Vals alarm is
zeldzaam: 25 uren waarop hij 30 of meer zei terwijl het minder was, tegen 4 uren 40 of meer die er
helemaal niet waren.

IJmuiden mist veel meer: 96,0% van de 833 uren boven de 30. Dat is dezelfde kapotte roostercel,
geen tweede meting.

## Wat dit doet met de 40 kn-grens

De bewering was: 40 op de pagina is in het echt rond 47. Die weerleggen we, en niet met een
doorgetrokken verhouding maar met de metingen zelf.

- Zegt de mix 26 tot 30 op Hoek van Holland, dan is de middelste echte meting **29,2 kn**, op 443 uren.
- Zegt hij 30 tot 35, dan is de middelste echte meting **33,0 kn**, op 111 uren.
- De verhouding is daar 1,02 tot 1,03. Trek je die door naar 40, dan kom je op ruwweg **41 kn**
  (dit ene getal is doorgetrokken, de rest is gemeten). Niet 47.
- De mix heeft op Hoek van Holland in 3,5 jaar **geen enkel uur** 40 of meer gezegd. De grens van 40
  is daar nog nooit aangeraakt.

De tegenrichting, sorteren op de gemeten wind, geeft 1,13 bij 30-35 en dan land je op 45. Maar die
richting selecteert de missers en beschrijft niet wat er op het scherm gebeurt.

Op IJmuiden zou het wel kloppen: mix 26-30 daar betekent middelste meting 35,0 kn. Maar dat station
loopt in elke band, tot bij windstilte, een derde uit de pas. Dat is een kapotte roostercel, geen
argument om een grens te verschuiven.

## 6. Blijft de verhouding vlak, en doet optellen het net zo goed

Hoek van Holland, 31.843 uren, gemiddelde misser zonder correctie 2,24 kn.
Beste optelling +1,4 kn laat 1,90 kn over. Beste factor x1,11 laat 1,95 kn over. De optelling wint
op het geheel, maar dat komt doordat de lage banden het gemiddelde dragen.

Rest-bias per band, model min meting in kn, na correctie. Nul is perfect.

| correctie | < 10 | 10-14 | 14-18 | 18-22 | 22-26 | 26-30 | 30-35 | 35-40 (n21) | 40+ (n4) |
|---|---|---|---|---|---|---|---|---|---|
| geen | -0,5 | -1,6 | -2,1 | -2,6 | -2,9 | -3,2 | -3,4 | -6,4 | -9,5 |
| +1,4 kn | +0,9 | -0,2 | -0,7 | -1,2 | -1,5 | -1,8 | -2,0 | -5,0 | -8,1 |
| x1,11 | +0,3 | -0,4 | -0,6 | -0,7 | -0,6 | -0,5 | -0,3 | -3,0 | -6,0 |

De factor houdt over het hele bereik bijna nul over, de optelling loopt vanaf 18 kn weg. Dus: ja,
vermenigvuldigen past beter dan optellen, en de vorm is vlak tot 35 kn. De laatste twee kolommen
staan op 21 en 4 uren en bewijzen niets.

IJmuiden is dezelfde vorm, maar veel groter en daar wint de factor ook op het geheel: ruw 3,88 kn,
beste optelling +3,3 laat 2,38 over, beste factor x1,35 laat 2,05 over.

## 7. Vlagen

Model-vlaag tegen KNMI FX, de hoogste vlaag in dat uur. Verhouding gemeten door model.

| gemeten vlaag | Hoek van Holland | IJmuiden | De Kooy |
|---|---|---|---|
| 10-14 | 1,055 n5400 | 1,078 n5813 | 0,923 n6587 |
| 18-22 | 1,074 n4890 | 1,092 n4918 | 0,953 n4651 |
| 26-30 | 1,077 n2623 | 1,073 n2582 | 0,978 n2057 |
| 30-35 | 1,083 n2161 | 1,071 n2269 | 0,999 n1267 |
| 35-40 | 1,081 n776 | 1,074 n766 | 1,000 n369 |
| 40+ | 1,093 n562 | 1,091 n879 | 1,043 n305 |

Dit is het nieuwste stuk, want niemand had het eerder gemeten, en het is een ander verhaal dan de
wind. De vlagen kloppen bijna. Hoek van Holland zit rond 1,07 tot 1,09 over het hele bereik, plat
als een dubbeltje. IJmuiden, dat op de gemiddelde wind 1,44 leest, zit op de vlaag gewoon op 1,08.
Op de vlaag is IJmuiden dus niet kapot.

Gevolg voor de pagina: **de vlaag verdient niet dezelfde correctie als de wind.** De pagina telt bij
de grove modellen dezelfde optelling bij de vlaag als bij de wind. Gemeten over 3,5 jaar is de beste
correctie op de fijne vlaag +0,4 kn op Hoek van Holland, +0,6 op IJmuiden en +0,0 op De Kooy, tegen
+1,4 en +3,3 op de wind. Winter en zomer verschillen ook hier nauwelijks: 1,059 tegen 1,042 op Hoek
van Holland, 1,072 tegen 1,064 op IJmuiden.

Er zit een verklaring onder. Het uurgemiddelde over zee wordt door het model geremd alsof er land
onder ligt; de piek in dat uur wordt dat veel minder. Dat is ook waarom IJmuiden op wind uit de pas
loopt en op vlaag niet.

## Hoe zeker is dit

| | |
|---|---|
| gekoppelde uren | 96.329 over drie stations |
| periode | 01-01-2023 t/m 10-09-2026 |
| winters (okt t/m mrt) | 4 |
| dekking AROME-HD | 96.047 uren wind, 87.357 uren vlaag, vanaf 01-01-2023 |
| dekking ICON-D2 | 96.056 uren wind, vanaf 01-01-2023 |
| dekking UKV | 96.329 uren wind, vanaf 01-01-2023 |
| dekking KNMI Harmonie | 43.872 uren, **pas vanaf 01-01-2025** |

Waar de n te klein blijft, ook na 3,5 jaar:

- **Hoek van Holland boven de 35 kn.** 21 uren in 35-40, 4 in 40+. Elk getal daar heeft een interval
  breder dan 0,10 en bewijst niets. De tabellen laten die banden staan, met de n erbij, maar reken er
  niet mee.
- **De Kooy boven de 30 kn.** 45 uren in 30-35, 6 in 35-40, nul daarboven.
- **De hele 40 kn-band op de piers.** 45 uren samen, waarvan 41 op IJmuiden en dus op de roostercel
  die sowieso uit de pas loopt.

Wat er ook na 3,5 jaar niet uit te halen valt:

- **Wat de mix doet als hij zelf 40 zegt.** Dat is nooit gebeurd op Hoek van Holland en IJmuiden, en
  1 keer op De Kooy. De grens van 40 blijft daarmee ongetoetst aan de bovenkant; hij is alleen van
  onderaf benaderd.
- **Het verschil tussen de vier modellen bij storm.** KNMI Harmonie doet pas vanaf 2025 mee, dus de
  mix is voor 2023 en 2024 een mix van drie. Alle stormen van 2023 en 2024 zitten er zonder Harmonie in.
- **Wat het strand doet.** Alle drie de stations zijn pier of landmast. Het strand zit er tussenin en
  meet niemand.
- **Verschil per aanlooprichting bij harde wind.** Dat is hier niet uitgesplitst; met 228 uren boven
  de 30 op Hoek van Holland valt dat ook niet meer te splitsen.

Nog een grens: Open-Meteo bewaart in dit archief de best beschikbare run, geen vaste dag vooruit. De
60-daagse meting gebruikte wel een vaste dag 1. Op de vorm van de afwijking maakt dat niets uit, op
de grootte kan het iets schelen.

## Aanbeveling

**Niets veranderen aan de grenzen.** VEEL blijft 30, TEVEEL blijft 40. Gemeten vanuit de richting
die de lezer ziet, betekent 30 op het scherm ongeveer 30 in het echt en 40 ongeveer 41. De sprong
naar 47 was een doorgetrokken getal uit 21 zomeruren, en die vlieger gaat niet op.

Wel drie dingen om te weten:

1. **De vlaag hoort geen wind-correctie.** Dit is het enige punt waar de meting tegen de huidige
   pagina in gaat. De fijne vlaag heeft +0,4 kn nodig, de fijne wind +1,4. Als dit ergens een
   wijziging rechtvaardigt, dan daar, en pas na een eigen ijkronde.
2. **Hoek van Holland is de bruikbare pier, IJmuiden niet.** Elke kustbrede conclusie die op
   "piers samen" rust, is een IJmuiden-conclusie. Als de 60-daagse meting daarop leunde, leunt ze
   scheef.
3. **Vermenigvuldigen is de goede vorm, niet optellen**, en de factor voor Hoek van Holland is
   x1,11, vlak tot 35 kn. Dat is wat de correctie mag zijn, niet x1,18.

## Getoetst en afgevallen: Harmonie uit de mix halen

Gevraagd op 12-09: zit er een patroon in welke combinatie van fijne modellen het best werkt?
Getoetst zijn alle 15 combinaties van de vier fijne modellen, op de uren waarop ze alle vier
bestaan (2025 t/m september 2026, ongeveer 14.500 uren per station).

Op Hoek van Holland zag het er sterk uit. De huidige mix van vier stond achtste van de vijftien,
en elke combinatie zonder KNMI Harmonie versloeg elke combinatie met Harmonie erin.

| station | nu, vier modellen | zonder Harmonie | winst |
|---|---|---|---|
| Hoek van Holland | fout 2,83 · HSS 0,608 | fout 2,61 · HSS 0,655 | **+0,047** |
| IJmuiden | fout 3,88 · HSS 0,503 | fout 3,97 · HSS 0,495 | -0,008 |
| De Kooy | fout 2,15 · HSS 0,640 | fout 2,16 · HSS 0,633 | -0,007 |

Het houdt dus op één station van de drie stand. Dat is geen patroon maar een toevalstreffer:
wie 15 combinaties naast 3 stations legt heeft 45 vakjes, en dan springt er altijd wel een uit.
**Niet doen.** De mix blijft vier modellen met Arthurs gewichten.

Dit is meteen het beste argument tegen een eigen tabel op de VPS waarin van alles wordt
meegeschreven om later naar patronen te zoeken. Hoe meer vakjes je maakt, hoe zekerder je
iets vindt dat er niet is. Een vondst telt pas als hij op een station standhoudt dat je
niet gebruikt hebt om hem te vinden.

## Wanneer kijk je hier weer naar, en waarnaar

Sinds 12-09-2026 loopt er een tabel mee op de VPS (zie `ARCHITECTUUR.md`, hoofdstuk 7). Niet alles
wat daarin komt is even nuttig, en dat is belangrijk om te weten voordat je over een paar maanden
gaat zitten zoeken.

| vraag | wacht je op de tabel? | waarom |
|---|---|---|
| Leest de fijne mix in de winter anders? | **nee** | al beantwoord, op vier winters uit het archief. Winter wijkt 0,02 tot 0,04 af, en leest juist iets minder laag |
| Klopt de grens van 40 kn? | **nee, wacht op weer** | het archief heeft de dag na een storm alles. Draai `node toets-lang.mjs` opnieuw zodra er een keer 35 kn of meer gestaan heeft |
| Moet er een correctie op de fijne modellen? | **nee** | gemeten over 96.329 uren: niet doen. Zie hierboven |
| Klopt zijn ondergrens van 14 kn met wat hij echt doet? | **ja** | daar heb je sessies voor nodig, en die staan nergens anders |
| Gaat hij op dagen die de pagina afraadt? | **ja** | zelfde reden |
| Hoe voelt een dag die de pagina een 8 geeft? | **ja** | het oordeel is het enige dat geen enkele bron kan terughalen |

Kort: **de sessietabel is waar de winst zit, de rest is verzekering.** Het archief van Open-Meteo
levert model-tegen-paal altijd al, 3,5 jaar diep, in een paar minuten. De tabel heeft over drie
maanden drie maanden.

Zinvol moment om terug te komen: **na de winter, met minstens tien bevestigde sessies**. Minder dan
tien en je bent weer aan het zoeken in te weinig vakjes, precies de fout die op deze pagina hierboven
beschreven staat.
