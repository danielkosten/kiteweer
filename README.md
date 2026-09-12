# Kiteweer, de ADHD-view

Live: https://danielskiing.cloud/kiteweer/ (ook nog https://danielkosten.github.io/kiteweer/)

Eén dag, één tabel, kleur voor goed en slecht, en een luchtfoto met pijlen. Gebouwd op het werk van
Arthur Kosten: modellen, meetstations, stroming en spotkennis uit
[ajk68/windcalendar](https://github.com/ajk68/windcalendar), live op https://ajk68.com/kiteweer/. Daar
staat alle data en de uitleg van de gewichten; hier staat alleen een andere voorkant.

## Wat er staat

| Bestand | Wat |
|---|---|
| `index.html`, `app.js`, `stijl.css` | de pagina, geen build, geen framework |
| `laad.js` | haalt wind, golven, weer en zon live uit Open-Meteo (gratis, geen sleutel), 30 min cache, terugval op `uur.js` |
| `data.js` | spots, veilige windsectoren, laatste stroming en metingen (snapshot uit Arthurs database) |
| `gen-uur.mjs` | maakt `uur.js` opnieuw: `node gen-uur.mjs` |
| `verifieer.mjs` | toetst elk model en elke mix tegen KNMI Hoek van Holland: `node verifieer.mjs` |

## Hoe de wind wordt berekend

Acht modellen apart opgehaald. Per uur de gewogen middelste waarde; gewicht = Arthurs gemeten trefzekerheid
(SPEC §13). **DAJK-mix** (standaard): alleen de fijne 2 km-modellen zolang ze reiken (2 dagen), daarna de
grove. **AJK-mix**: fijn en grof altijd 50/50, zoals op ajk68.com. Kite-maat `2,2 × kg / kn × board`,
geijkt op drie eigen sessies. Stroming tegen de wind telt als goed (SPEC §9).

Alle uitleg staat in de pagina zelf, onder de ⓘ.
