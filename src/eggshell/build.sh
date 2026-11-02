#!/bin/sh
# Glue the pieces together into one file you can open in any browser.
cd "$(dirname "$0")"
cat 00_head.html 10_audio.js 20_core.js 30_ray.js 40_game.js 51_running.js 52_building.js 53_survival.js 54_bombing.js 55_tanking.js 60_main.js 99_tail.html > ../../EggshellBombing.html
echo "Built EggshellBombing.html"
