#!/bin/sh
# Glue the pieces together into one file you can open in any browser.
cd "$(dirname "$0")"
{
  cat 00_head.html
  echo '<script>'
  cat 10_core.js 20_art.js 30_data.js 40_levelgen.js 50_engine.js 60_bosses.js 70_render.js 80_ui.js
  echo '</script>'
  echo '</body>'
  echo '</html>'
} > ../../IvyDessertQuest.html
echo "Built IvyDessertQuest.html"
