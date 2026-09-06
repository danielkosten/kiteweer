# 0003 ECMWF 9 km in plaats van 25 km

**Besluit.** `ecmwf_ifs` (IFS HRES, 9 km, uurlijks, 15 dagen) vervangt `ecmwf_ifs025` (open data,
25 km, 3-uurlijks).

**Grond.** ECMWF zette de volle HRES op 1 oktober 2025 open; Open-Meteo levert hem gratis. Meting
(0001): 25 km bias -5,5 tot -5,8 op de piers, HSS dag 1–7 0,04–0,12; 9 km bias -4,2, HSS 0,13–0,28.
De 25 km-versie was op elke dag het slechtste model van allemaal. Open-Meteo's eigen `knmi_seamless`
en `best_match` schakelen na 2,5 dag ook op de 9 km over.

**Status.** Aan sinds 2026-09-06. Opgeslagen keuzes met het oude id worden bij het laden omgezet.
