# 0006 De oude DAJK-mix blijft in code, niet in de UI

**Besluit.** De mix van vóór 2026-09-06 (fijn zolang het reikt, dan ECMWF/GFS/ICON zonder optelling)
heet in code `dajk-oud` en is te kiezen door `kiteweer.mix` in localStorage op die waarde te zetten.
In het paneel staan alleen DAJK-mix en AJK-mix.

**Grond.** Vergelijken moet kunnen (toets-horizon.mjs, rij DAJK-oud) zonder een derde knop die
niemand hoeft te begrijpen. Eén paneel, één keuze.

**Status.** Aan sinds 2026-09-06.
