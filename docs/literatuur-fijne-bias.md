# Voorspellen fijne weermodellen de kustwind te laag?

Literatuuronderzoek, 12-09-2026. Geen code, geen meting van onszelf.
Doel: beslissen of kiteweer bij de fijne modellen (1 tot 2,5 km) net zo'n
vaste optelling moet krijgen als bij de grove (+3 kn).

Elke claim heeft een bron-URL. Achter elke claim staat **feit** (zo staat het
in de bron) of **interpretatie** (mijn lezing), plus vertrouwen hoog/midden/laag.

## De vraag in gewone woorden

Een weermodel deelt de wereld op in vierkante vakjes. Een fijn model heeft
vakjes van 1 tot 2,5 km, een grof model 9 tot 25 km. Voor elk vakje rekent het
een windsnelheid uit op 10 m hoogte. Een meetpaal van het KNMI meet op een punt.
De vraag: waait het op die meetpunten aan de kust structureel harder dan het
model zegt, en zo ja, hoeveel, en waarom.

Vier modellen: KNMI HARMONIE-AROME (2,5 km), DWD ICON-D2 (2,2 km),
Met Office UKV (2 km), Meteo-France AROME-HD (1,3 km).

## Kort antwoord

| Vraag | Antwoord | Vertrouwen |
|---|---|---|
| Bestaat een structurele onderschatting van kustwind? | Deels. Niet als vaste offset over alle situaties, wel bij harde wind | hoog |
| Is hij richtingafhankelijk? | Ja. Aflandig (van land naar zee) is het grootste probleem | hoog |
| Is hij sterkteafhankelijk? | Ja. Hoe harder het waait, hoe groter de onderschatting | hoog |
| Zit er ook meetpaal-effect in? | Ja, aantoonbaar bestaand mechanisme, maar niet becijferd voor Hoek van Holland of IJmuiden | midden |
| Is een vaste optelling (+X kn) gangbaar in de literatuur? | Nee. De gangbare praktijk is statistische correctie per station | hoog |

## 1. Bestaat het effect in de literatuur?

### HARMONIE-AROME en de Nederlandse Noordzee

Het beste primaire stuk is het KNMI-rapport TR-380 over de Dutch Offshore Wind
Atlas (DOWA), die gemaakt is met HARMONIE-AROME Cy40 op 2,5 km.
Bron: https://cdn.knmi.nl/knmi/pdf/bibliotheek/knmipubTR/TR380.pdf

| Waar | Wat het rapport zegt | Type |
|---|---|---|
| Hele Noordzee | DOWA **overschat** de 10 m wind ten opzichte van satellietmetingen (ASCAT), gemiddeld minder dan 0,2 m/s | feit |
| Kustzone, 15 tot 30 km uit de kust | Alle vier de datasets (ERA-Interim, KNW, ERA5, DOWA) **onderschatten** juist de 10 m wind daar; DOWA met 0,3 m/s, KNW met 0,4 m/s | feit |
| Kustlidar, wind vanaf zee tegen wind vanaf land | De afwijking verschilt duidelijk per richting. Bij DOWA is de afwijking bij landwind kleiner dan bij zeewind; bij de oudere KNW-atlas precies andersom | feit |

Let op wat hier staat en wat niet. Boven open zee zit het model iets te hoog,
vlak bij de kust iets te laag. De omslag zit dus in de kustzone zelf. Dat is
precies de zone waar Hoek van Holland en IJmuiden staan. **Interpretatie,
vertrouwen midden.**

Grootte: 0,3 m/s is ongeveer 0,6 knoop. Dat is klein. Het is een fractie van de
+3 kn die kiteweer bij de grove modellen optelt. **Feit uit de bron, de
vergelijking met +3 kn is mijn interpretatie, vertrouwen hoog.**

### Onderschatting groeit met de windsnelheid

Kalverla et al. (2020) vergeleken DOWA, ERA5 en NEWA met de meetmast IJmuiden.
Bron: https://rmets.onlinelibrary.wiley.com/doi/10.1002/qj.3748

- Stabiele situaties (rustige, gelaagde lucht) geven een flinke **positieve**
  afwijking: het model zit dan te hoog. **Feit, hoog.**
- Harde wind geeft een grote **negatieve** afwijking: het model zit dan te laag.
  Alle modellen onderschatten heel harde wind. **Feit, hoog.**
- DOWA geeft het windprofiel het beste weer, met vrijwel geen gemiddelde
  afwijking. **Feit, hoog.**

Dit is de belangrijkste vondst voor kiteweer. Het gemiddelde is bijna nul, maar
dat gemiddelde is een optelsom van te hoog bij weinig wind en te laag bij veel
wind. Een vaste optelling zou het rustige deel kapotmaken om het harde deel te
repareren. **Interpretatie, vertrouwen hoog.**

Getal in m/s voor die negatieve afwijking bij harde wind: **niet gevonden** in
een vrij toegankelijke versie. Het artikel zit achter een betaalmuur.

### De andere drie modellen

| Model | Wat gevonden | Bron | Vertrouwen |
|---|---|---|---|
| Meteo-France AROME | Onderschat het aantal gevallen van harde windstoten met 5 tot 20 procent, over het hele bereik | https://rmets.onlinelibrary.wiley.com/doi/10.1002/met.1510 | midden |
| Met Office UKV / UM | In een studie over aflandige wind **overschat** het UKMO-model juist, terwijl ECMWF onderschat | https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023JD039673 | midden |
| DWD ICON-D2 | Geen verificatiestudie gevonden die de 10 m wind aan de kust apart behandelt | niet gevonden | n.v.t. |

Belangrijk: de UKV-bevinding wijst de **andere kant op**. Er is dus geen
universele "fijne modellen zitten te laag aan de kust". Het hangt van het model
af. **Feit uit de bron, hoog.** Kanttekening: die studie ging over de
Middellandse Zee, niet de Noordzee. **Feit, hoog.**

## 2. Hoe groot, en waar hangt het van af?

| Afhankelijkheid | Wat de literatuur zegt | Bron | Vertrouwen |
|---|---|---|---|
| Windsterkte | Ja, sterk. Te hoog bij rustig en stabiel, te laag bij hard | https://rmets.onlinelibrary.wiley.com/doi/10.1002/qj.3748 | hoog |
| Windrichting | Ja. Aflandige wind (van land naar zee) is het lastigste geval; de afwijking hangt af van hoeveel modelvakjes de wind over zee heeft afgelegd | https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023JD039673 | hoog |
| Richting, apart voor de Nederlandse kust | Ja, verschil tussen zeewind en landwind gemeten met kustlidar, maar zonder dat TR-380 er een enkel getal aan hangt | https://cdn.knmi.nl/knmi/pdf/bibliotheek/knmipubTR/TR380.pdf | midden |
| Seizoen | Alleen indirect gevonden: de meetcorrectie van het KNMI bleek 's winters in de sector west tot noord te groot | https://www.knmi.nl/kennis-en-datacentrum/publicatie/improving-potential-wind-for-extreme-wind-statistics | midden |
| Ordegrootte kustzone | 0,3 m/s (ongeveer 0,6 kn) voor DOWA, 15 tot 30 km uit de kust, tegen satellietmetingen | https://cdn.knmi.nl/knmi/pdf/bibliotheek/knmipubTR/TR380.pdf | hoog |

Een getal voor de afwijking op een KNMI-kuststation zelf, zoals Hoek van Holland
of IJmuiden, in een operationele HARMONIE-verificatie: **niet gevonden**.

## 3. Welke verklaringen geeft de literatuur?

Vier kandidaten stonden in de vraag. Dit is wat ik er wel en niet over vond.

| Kandidaat | Wat het is, gewoon gezegd | Steun in de literatuur | Vertrouwen |
|---|---|---|---|
| Charnock-relatie | De vuistregel die zegt hoe ruw een zeeoppervlak wordt naarmate het harder waait: meer wind, hogere golven, meer wrijving | Steun, maar indirect. De Charnock-aanpak onderschat de wind systematisch in stabiele situaties. Bron gaat over ERA5, niet over HARMONIE: https://wes.copernicus.org/articles/9/1727/2024/ | midden |
| Grenslaag bij stabiele gelaagdheid | Hoe het model de onderste luchtlaag behandelt als die rustig en gelaagd is | Sterke steun. Alle modellen worstelen met stabiele situaties en maken dan onrealistische luchtlagen: https://wes.copernicus.org/articles/4/193/2019/ | hoog |
| Aanlooplengte over zee (fetch) | Hoe ver de wind al over water heeft gelopen voordat hij bij het meetpunt komt. Over water waait het harder dan over land, dus de wind versnelt onderweg | Sterke steun. De afwijking is een functie van het aantal modelvakjes dat de wind over zee aflegt; een grof model heeft er te weinig om de versnelling op te bouwen: https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023JD039673 | hoog |
| Land-zee-vakje op de kustlijn | Een modelvakje op de kustlijn is half land, half zee, dus het model rekent met een gemiddelde ruwheid | Sterke steun, algemeen geformuleerd door ECMWF: kustvakjes mengen land- en zee-eigenschappen en zijn daarom niet representatief voor een station aan de kust: https://confluence.ecmwf.int/display/FUG/Section+3.2+Grid+Point+Values+and+Observations | hoog |

Een verklaring die specifiek voor HARMONIE-AROME boven de Nederlandse kust is
uitgewerkt en getoetst: **niet gevonden**.

## 4. Meethoogte en blootstelling: hoeveel is modelfout, hoeveel is de paal?

Dit is de scherpste vraag en het antwoord is het minst bevredigend.

Feit, hoog vertrouwen: het model geeft een **gemiddelde over een vakje**, de
meetpaal geeft een **punt**. ECMWF schrijft dit expliciet uit: systematische
fouten komen voort uit de plek, hoogte en blootstelling van het meetpunt, en
kuststations zijn een genoemd voorbeeld. Sommige verificatiesystemen gooien
stations op een blootgestelde plek er daarom uit.
Bron: https://confluence.ecmwf.int/display/FUG/Section+3.2+Grid+Point+Values+and+Observations

Feit, hoog vertrouwen: het KNMI kent dit probleem en heeft er een eigen grootheid
voor, de **potentiele windsnelheid**. Dat is de gemeten wind vermenigvuldigd met
een blootstellingsfactor, die corrigeert voor het feit dat de omgeving ruwer of
gladder is dan kort gemaaid gras en dat de meethoogte niet precies 10 m is.
Bron: https://www.knmi.nl/kennis-en-datacentrum/project/potential-wind

Feit, hoog vertrouwen: die factor wordt per windrichting bepaald, en het KNMI
heeft de methode verbeterd door bij kuststations de richtingafhankelijkheid van
de referentieruwheid en de hoogte mee te nemen. Ze vonden dat de oude factoren
's winters in de sector west tot noord te groot waren.
Bron: https://www.knmi.nl/kennis-en-datacentrum/publicatie/improving-potential-wind-for-extreme-wind-statistics

Wat **niet gevonden** is: een gepubliceerde blootstellingsfactor voor Hoek van
Holland (330) of IJmuiden (225) met een getal erbij, of een KNMI-stuk dat uitlegt
hoeveel harder het op die pier waait dan in de omliggende kilometers.

Interpretatie, vertrouwen midden: het feit dat het KNMI een richtingafhankelijke
correctie per station nodig heeft, is het sterkste signaal dat het verschil
tussen model en meting aan de kust **deels geen modelfout is**. Als een
correctiefactor per station en per richting nodig is om metingen onderling
vergelijkbaar te maken, dan zit dat verschil ook in elke vergelijking tussen dat
station en een modelvakje.

Praktische consequentie voor kiteweer: de wind op die pier is precies wat een
kiter voelt. Dat het geen modelfout is, maakt het niet minder waar voor de
gebruiker. Maar het betekent wel dat de optelling niet naar het model hoort maar
naar de plek. **Interpretatie, vertrouwen midden.**

## 5. Wat doen anderen eraan?

| Praktijk | Wie | Bron | Vertrouwen |
|---|---|---|---|
| Statistische correctie per station (MOS), niet per model | DWD MOSMIX: postprocessing van ICON en IFS naar circa 5400 stations, met meervoudige regressie op lange reeksen model- en stationsdata, onder andere voor 10 m wind en windstoten | https://www.dwd.de/EN/research/weatherforecasting/met_applications/nwp_applications/mosmix_application.html | hoog |
| Correctie afhankelijk van aanlooplengte over water | Statistische methode die juist per fetch corrigeert, in plaats van een vaste offset | https://journals.ametsoc.org/waf/article/32/4/1637/41135/A-Fetch-Based-Statistical-Method-to-Bias-Correct | hoog |
| Correctie per windband (quantielcorrectie) | Standaard bij offshore-wind; ERA5-onderschatting bij harde wind wordt per snelheidsklasse gecorrigeerd, niet met een vaste optelling | https://wes.copernicus.org/articles/9/1727/2024/ | hoog |
| Vaste optelling van X m/s over alle situaties | **Niet gevonden** als aanbevolen praktijk in enige bron | n.v.t. | n.v.t. |

Feit, hoog vertrouwen: geen enkele geraadpleegde bron beveelt een vaste optelling
aan. Wat de literatuur wel doet, is corrigeren per station, per windband, per
richting of per aanlooplengte.

## Wat onbekend blijft

- ICON-D2 aan de Nederlandse kust: geen verificatie gevonden.
- Een getal voor de HARMONIE-afwijking op station 330 of 225 zelf.
- De blootstellingsfactor van die twee stations, met getal.
- De grootte van de negatieve afwijking bij harde wind in Kalverla 2020, in m/s.
  Artikel achter betaalmuur.
- Of de kustzone-onderschatting van 0,3 m/s ook geldt op de kustlijn zelf. De
  gemeten zone was 15 tot 30 km uit de kust.

## Wat dit betekent voor kiteweer

**Aanbeveling: geen vaste optelling bij de fijne modellen. Corrigeer per
windband, en wacht op de eigen meting voordat je iets zet.**

De redenering, drie stappen.

1. De onderschatting die de literatuur bij fijne modellen boven de Nederlandse
   Noordzee vindt is **klein**: circa 0,3 m/s, ongeveer 0,6 knoop, en dan nog
   alleen in de kustzone, want boven open zee zit hetzelfde model juist te hoog.
   Dat is niet de +3 kn die bij de grove modellen nodig bleek. Dat verschil is
   logisch: een grof model ziet de kust helemaal niet, een fijn model wel.
2. Wat er wel is, is **niet vast**. Te hoog bij rustig en stabiel weer, te laag
   bij harde wind. Voor kiteweer telt precies het bovenste stuk, want daar
   begint een sessie. Een vaste optelling zou daar te weinig geven en bij 12
   knopen valse hoop geven.
3. Een deel van het verschil dat de eigen meting straks laat zien is
   waarschijnlijk **geen modelfout maar de meetpaal**. Hoek van Holland en
   IJmuiden staan op een havenhoofd en hangen vrijer in de wind dan het gebied
   dat het modelvakje beschrijft. Het KNMI corrigeert daar zelf voor, per
   station en per richting, en dat is een aanwijzing dat de correctie bij de
   plek hoort en niet bij het model.

Concreet, als de eigen meting straks een verschil laat zien:

| Als de meting zegt | Doe dit |
|---|---|
| Verschil groeit met de windsnelheid | Correctie per windband, niet een vaste optelling. Bijvoorbeeld niets onder 12 kn, oplopend daarboven |
| Verschil verschilt per richting (aanlandig tegen aflandig) | Correctie per sector. Dit is wat het KNMI zelf doet voor zijn eigen metingen |
| Verschil is gelijk over alle sterktes en richtingen | Dan is een vaste optelling verdedigbaar, maar noem hem dan een stationscorrectie, niet een modelcorrectie |
| Verschil is kleiner dan ongeveer 1 kn | Niets doen. Dat is kleiner dan de meetonzekerheid en kleiner dan het verschil tussen twee vakjes |

Interpretatie, vertrouwen hoog: een vaste optelling op een fijn model is volgens
deze literatuur **niet verdedigbaar als modelcorrectie**. Verdedigbaar is hij
alleen als eerlijk gelabelde plekcorrectie, geijkt op Daniels eigen sessies, met
de kanttekening dat hij dan alleen geldt voor spots bij die meetpaal.

## Bronnenlijst

- KNMI TR-380, Dutch Offshore Wind Atlas: https://cdn.knmi.nl/knmi/pdf/bibliotheek/knmipubTR/TR380.pdf
- Kalverla et al. 2020, wind atlases North Sea: https://rmets.onlinelibrary.wiley.com/doi/10.1002/qj.3748
- Kalverla et al. 2019, low-level jets North Sea: https://wes.copernicus.org/articles/4/193/2019/
- Cavaleri et al. 2024, offshore blowing winds ECMWF en UKMO: https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023JD039673
- Amodei et al. 2015, verificatie AROME: https://rmets.onlinelibrary.wiley.com/doi/10.1002/met.1510
- ERA5 onderschatting harde wind offshore, met correctie: https://wes.copernicus.org/articles/9/1727/2024/
- ECMWF Forecast User Guide, roosterwaarde tegen puntmeting: https://confluence.ecmwf.int/display/FUG/Section+3.2+Grid+Point+Values+and+Observations
- KNMI, potentiele wind: https://www.knmi.nl/kennis-en-datacentrum/project/potential-wind
- KNMI, verbetering potentiele wind: https://www.knmi.nl/kennis-en-datacentrum/publicatie/improving-potential-wind-for-extreme-wind-statistics
- DWD MOSMIX: https://www.dwd.de/EN/research/weatherforecasting/met_applications/nwp_applications/mosmix_application.html
- Fetch-gebaseerde biascorrectie: https://journals.ametsoc.org/waf/article/32/4/1637/41135/A-Fetch-Based-Statistical-Method-to-Bias-Correct
- HARMONIE-AROME modelbeschrijving: https://repositorio.aemet.es/bitstream/20.500.11765/7320/1/MWR-D-16-0417.pdf
