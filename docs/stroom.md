# Stroming: waar die vandaan komt

De getijstroom stond tot 11 september 2026 vast in `data.js`, een handgemaakte kopie uit Arthurs
database van 6 september. Die liep af op 11-09 21:00, dus daarna stond de hele rij op `—`.

Nu haalt `gen-stroom.mjs` hem zelf op bij **Rijkswaterstaat MATROOS**, dezelfde openbare deur die
Arthur gebruikt (`noos.matroos.rws.nl/direct/get_series.php`, geen sleutel, geen account). Een
GitHub Action draait elke nacht om 02:20 UTC, schrijft `stroom.js` en commit hem.

| | |
|---|---|
| Bron | `dcsm_fm05nm_astro`, het 0,5 zeemijl-model van Rijkswaterstaat |
| Wat erin zit | het **astronomische getij**: de stroom die eb en vloed maken |
| Wat er NIET in zit | de opzet door wind. De windgeforceerde modellen geven op deze openbare server nul antwoorden (Arthurs issue #32); die zitten achter een login. De legenda op de pagina zegt dat |
| Bereik | van 6 uur terug tot 8 dagen vooruit, ruim over de 7 dagen wind heen |
| Stap | elke 20 minuten. `app.js` pakt de meting die het dichtst bij het uur zit, tot maximaal een uur ernaast |
| Punten | 17 van de 20, voor 35 van de 64 spots |

## Welk punt bij welke spot

Dat is **Arthurs curatie**, niet iets wat wij berekenen. Het dichtstbijzijnde punt is nadrukkelijk
niet de regel: twee buurpunten schelen een factor 9 (windcalendar SPEC.md §9). De koppeling staat
als `PUNTEN` bovenin `gen-stroom.mjs`, overgeschreven uit `spots.yaml` veld `matroos_punt`.

Opnieuw afdrukken uit een verse `spots.yaml`:

```bash
cd ~/Code/personal/kiteweer && python3 - <<'PY'
import json, yaml
d = json.loads(open('data.js').read().split('=', 1)[1].strip().rstrip(';'))
w = yaml.safe_load(open('../windcalendar/spots.yaml'))
byk = {s['key']: s for s in (w['spots'] if isinstance(w, dict) else w)}
m = {s['id']: byk[s['key']]['matroos_punt'] for s in d['spots']
     if s['key'] in byk and byk[s['key']].get('matroos_punt')}
m['zandmotor'] = 'Katwijk'   # eigen spot, niet in Arthurs lijst; deelt het punt met Kijkduin
print(json.dumps(m, ensure_ascii=False, indent=2))
PY
```

## Drie punten doen het niet

`Passage Kaloo` (Domburg), `Eemsboei 51` (Delfzijl) en `Harlingen Havenmond` bestaan niet op dit
rooster: de server antwoordt `Unavailable location`. Die drie spots houden geen stroming, net als
de 26 binnenwater-spots die er nooit een hadden. Het script probeert ze niet opnieuw.

## Zelf draaien

```bash
node gen-stroom.mjs      # duurt ongeveer een minuut, schrijft stroom.js
```

Lukt geen enkel punt, dan schrijft hij niets en stopt met code 1, zodat een kapotte bron nooit een
lege `stroom.js` overheen zet.

## Onze getallen zijn niet Arthurs getallen, en dat klopt

Nagerekend op Kijkduin/Katwijk, 6 september, tegen de oude blokken in `data.js`:

| blok | Arthur | wij |
|---|---|---|
| 03:00 | 0,76 kn 212° | 0,50 kn 213° |
| 06:00 | 0,64 kn 210° | 0,78 kn 212° |
| 09:00 | 0,70 kn 35° | 0,20 kn 45° |
| 12:00 | 0,60 kn 31° | 0,75 kn 31° |

De **richting** is elke keer gelijk, dus we lezen hetzelfde water uit dezelfde bron. De **sterkte**
verschilt omdat hij per 3-uursblok middelt en wij de meting zelf pakken die het dichtst bij het uur
zit. Rond een kentering, als de stroom omdraait, lopen die twee het verst uiteen: om 09:00 staat de
stroom bijna stil (0,2 kn), maar het gemiddelde over die drie uur is 0,7 kn.

Voor deze pagina is de meting zelf de juiste keuze, want de tabel is per uur. Arthurs eigen code
zegt hetzelfde over zijn kant: niet middelen over een uur, want dan verdwijnt de kentering
(`src/feeds.ts`, opmerking bij `fetchMatroosSource`). Zijn gemiddelde hoort bij zijn 3-uursblokken.

## Een slechte nacht mag niks wegnemen

Vanaf de GitHub-servers mislukken meer punten dan vanaf een laptop: gemeten op 11-09 drie thuis
tegen negen daar. RWS knijpt af bij te snel achter elkaar vragen. Daarom vijf pogingen met een
steeds langere pauze, en wat dan nog mislukt **houdt de reeks van gisteren**, zolang die nog twee
dagen vooruit reikt. Getij is astronomisch, dus een dag oude voorspelling is nog steeds goed.

Getest door de bron expres onbereikbaar te maken: alle 20 calls mislukten, alle 17 punten bleven
staan.

## De terugval-bundel ververst mee

`uur.js` is de noodvoorraad wind: die laadt alleen als Open-Meteo niet reageert. Hij liep ook af,
op 12-09 23:00, want hij is één keer met de hand gemaakt. Dezelfde nachtelijke Action draait nu ook
`gen-uur.mjs`, dus die voorraad is nooit meer dan een dag oud. Vier spots, zoals altijd: het is een
noodgeval-bundel, geen tweede databron.
