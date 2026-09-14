# kiteweer

Statische pagina, Nederlands, geen build. Lees `README.md` voor de relatie met `ajk68/windcalendar` (Arthur, papa).

- Lees `ARCHITECTUUR.md` voor wat waar staat en wat wat raakt, voor je iets verandert.
- Alles wat rekent (gewichten, gate, stroming, sectoren) is van Arthur; niet zelf verzinnen, verwijzen naar zijn SPEC (`../windcalendar/SPEC.md`).
- Drempels zijn geijkt op Daniels eigen sessies (zie commentaar in `app.js`); een drempel wijzigen = eerst `node verifieer.mjs` draaien.
- De VPS serveert de root van `main` (via `git pull` in `ververs.sh`). Geen mappen verplaatsen zonder de live URL te checken. GitHub Pages staat uit sinds 2026-09-14: elke push van de VPS gaf een Pages-build en bij een GitHub-storing een foutmail.
- Wijzigingen ook naar `../windcalendar` tak `daniel-view`, map `static/daniel/`, dan PR naar Arthur.
- Code en commentaar in het Nederlands, geen em-dash.
- De look van deze pagina is Daniels huisstijl: vastgelegd in `~/Code/daniel-unleashed/plugins/core-design/skills/house-style/SKILL.md`. Nieuwe stijl hier = ook daar bijwerken.
