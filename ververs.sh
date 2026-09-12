#!/bin/bash
# Haalt op wat de meetstations van Rijkswaterstaat echt meten en zet het in de repo.
# Draait op deze VPS omdat de gratis klok van GitHub er maar een keer per 2 tot 5 uur aan toekomt,
# terwijl de metingen elk kwartier vernieuwen. Zie /etc/cron.d/kiteweer.
set -u
cd /opt/kiteweer || exit 1
# Nooit twee tegelijk: een tweede start valt er stil naast neer.
exec 9>/tmp/kiteweer.lock
flock -n 9 || exit 0
# Lukt het bijwerken niet, dan stoppen we gewoon: over tien minuten is er een nieuwe kans.
# Nooit iets weggooien hier, want deze map is ook de enige kopie van een mislukte push.
git pull --rebase --autostash -q origin main || { git rebase --abort 2>/dev/null; exit 0; }
node gen-meting.mjs || exit 0
# Wegschrijven naar de tabel gebeurt HIER, voor de exits hieronder: staat er geen nieuwe meting,
# dan stopt dit script, en dan zou er ook nooit een voorspelling in de tabel belanden.
# Mislukt het loggen, dan gaat de rest gewoon door: de pagina is belangrijker dan het archief.
node log-db.mjs || echo "log-db mislukt, verder met de rest"
git add meting.js
git diff --staged --quiet && exit 0
git commit -q -m "Metingen ververst"
# Het ophalen van 38 stations duurt een minuut of wat. Duwt iemand in dat raampje zelf iets naar
# main, dan is deze push te laat en werd hij geweigerd: de meting bleef dan tien minuten of langer
# liggen (12-09: 8 keer op een dag, laatste meting werd 28 minuten oud). Daarom opnieuw proberen
# met een verse rebase ertussen, drie keer, met een paar seconden ertussen.
for poging in 1 2 3; do
  git push -q origin main && exit 0
  echo "push geweigerd (poging $poging), opnieuw na rebase"
  sleep 5
  git pull --rebase --autostash -q origin main || { git rebase --abort 2>/dev/null; exit 0; }
done
echo "push na 3 pogingen nog steeds geweigerd; de commit blijft lokaal staan voor de volgende ronde"
