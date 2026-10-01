// Makes src/games/tadc/art.js from figures.js. Run: node tools/tadc-sprites/gen.mjs
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')
const http = require('http'), fs = require('fs'), path = require('path')
const here = path.dirname(new URL(import.meta.url).pathname)
const srv = http.createServer((q, s) => {
  const f = path.join(here, decodeURIComponent(q.url.split('?')[0]))
  fs.readFile(f, (e, d) => {
    if (e) { s.writeHead(404); s.end(); return }
    s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' })
    s.end(d)
  })
}).listen(5303)
const specs = JSON.parse(fs.readFileSync(path.join(here, 'gen-specs.json'), 'utf8'))
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1800, height: 1000 } })
p.on('pageerror', (e) => console.log('ERR', e.message))
await p.goto('http://localhost:5303/gen.html')
await p.waitForFunction(() => document.title === 'ready')
if (process.env.ZOOM) await p.evaluate((z) => (window.ZOOM = z), Number(process.env.ZOOM))
const out = []
for (const s of specs) out.push(await p.evaluate((s) => window.make(s), s))
await p.screenshot({ path: process.argv[2] || path.join(here, 'preview.png'), fullPage: true })
await b.close()
srv.close()
let js = '// Pixel sprites for the TADC Boss Rush, drawn in tools/tadc-sprites/figures.js and made by gen.mjs.\n'
js += '// Each sprite is rows of letters; each letter picks a colour from pal. ax is the middle of the body.\n'
js += '// eyes are where the pupils go, so bosses can look at Pomni: [x, y, w, h, colour, rangeX, rangeY].\n\n'
js += 'const S = (pal, ax, eyes, rows) => Object.assign(rows, { pal, ax, eyes })\n\nexport const ART = {\n'
for (const s of out) {
  const eyes = s.eyes.map((e) => [e.x, e.y, e.w, e.h, e.color, e.rx, e.ry])
  js += `  ${s.key}: S(${JSON.stringify(s.pal)}, ${s.ax}, ${JSON.stringify(eyes)}, [\n` + s.rows.map((r) => '    ' + JSON.stringify(r) + ',\n').join('') + '  ]),\n'
}
js += '}\n'
fs.writeFileSync(path.join(here, '../../src/games/tadc/art.js'), js)
console.log(out.map((s) => `${s.key} ${s.rows[0].length}x${s.rows.length}`).join('\n'))
