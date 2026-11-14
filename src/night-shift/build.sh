#!/bin/sh
# Build THE NIGHT SHIFT into one playable file: NightShift.html
# The game is written as plain script pieces that share one scope; this glues them into a single
# module (so it can import three.js), then lets Vite inline everything into one HTML file.
set -e
cd "$(dirname "$0")"
{
  echo "import * as THREE from 'three';"
  echo "import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';"
  echo "import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';"
  echo "import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';"
  echo "import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';"
  cat 10_core.js 20_audio.js 30_art.js 35_world.js 40_ui.js 50_sys.js 60_nights.js 70_flow.js 80_main.js
} > _all.js
{
  cat 00_head.html
  echo '<script type="module" src="/src/night-shift/_all.js"></script>'
  echo '</body>'
  echo '</html>'
} > ../../ns.html
cd ../..
npx vite build --config vite.config.ns.js --logLevel warn
cp standalone-ns/ns.html NightShift.html
echo "built NightShift.html ($(wc -c < NightShift.html) bytes)"
# Optional: a body-only copy (no <html>/<head>/<body> wrapper) for hosts that add their own.
if [ -n "$1" ]; then
  node -e "
const fs=require('fs');let h=fs.readFileSync('NightShift.html','utf8');
h=h.replace(/<!doctype html>/i,'').replace(/<\/?html[^>]*>/gi,'').replace(/<\/?head>/gi,'').replace(/<\/?body>/gi,'').replace(/<meta charset=[^>]*>/i,'').replace(/<meta name=\"viewport\"[^>]*>/i,'');
fs.writeFileSync(process.argv[1],h.trim()+'\n');" "$1"
  echo "built $1"
fi
