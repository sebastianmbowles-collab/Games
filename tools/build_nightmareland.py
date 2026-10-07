# Builds nightmareland.html from dreamland.html.
# Nightmareland is the dream self's own story: the same world, seen through his
# five emotions, dark and broken. Run:  python3 tools/build_nightmareland.py
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(ROOT, 'dreamland.html')).read()
NM_JS = open(os.path.join(ROOT, 'tools', 'nightmare_layer.js')).read()
NM_CSS = open(os.path.join(ROOT, 'tools', 'nightmare_layer.css')).read()

def R(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:90], s.count(a))
    s = s.replace(a, b)

# ---------- words ----------
R('<title>Dreamland</title>', '<title>Nightmareland</title>')
R('Falling asleep<span>.</span>', 'Remembering<span>.</span>')
R('Tap anywhere to start the dream</div>', 'Tap anywhere to remember</div>')
R('<div class="chapter">Chapter 1 · The Pastel Desert</div>', '<div class="chapter">The Dream Self\'s Story</div>')
R('<div class="tagline">A dream can hide anything.</div>', '<div class="tagline">Why was he so lonely…?</div>')
R('<div class="sub">Chapter 1 complete</div>', '<div class="sub">Nightmareland complete</div>')
R('''<a class="btn" href="nightmareland.html" style="text-decoration:none;background:#2a1020;color:#ff6a6a;border-color:#ff6a6a;box-shadow:3px 4px 0 #000">Chapter 2: Nightmareland →</a>''',
  '''<a class="btn" href="dreamland.html" style="text-decoration:none;background:#2a1020;color:#ff6a6a;border-color:#ff6a6a;box-shadow:3px 4px 0 #000">Play Dreamland →</a>''')
R("localStorage.getItem('dreamland-v1')", "localStorage.getItem('nightmareland-v2')")
R("localStorage.setItem('dreamland-v1', JSON.stringify(o))", "localStorage.setItem('nightmareland-v2', JSON.stringify(o))")
R("const WORD = 'DREAMLAND';", "const WORD = 'NIGHTMARELAND';")
R('<div class="chip">Keys <b id="hKeys">0</b>/10</div>', '<div class="chip">Memories <b id="hKeys">0</b>/5</div>')
R('<div class="chip">Kids <b id="hKids">0</b>/50</div>', '<div class="chip" hidden>Kids <b id="hKids">0</b>/50</div>')
R("const prog = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];",
  "const prog = [[45, 48, 52, 55], [44, 47, 50, 53], [41, 44, 48, 51], [40, 43, 46, 50]]; // minor and spooky")
# ---------- the dream self's prologue ----------
R("""    { text: 'The real world. Bedtime. Sebastian climbs into bed and closes his eyes…', d: 3.4, snap: true, pos: [1.5, 2.6, 1.5], look: [-3.4, .8, -3],
      on: () => { $('game').style.transition = 'filter 1.6s'; $('game').style.filter = 'grayscale(1) brightness(.7)'; } }, // the real world is grey and ordinary
    { text: 'When he opens them, his room is different. His toys are floating!', d: 3.5, pos: [0, 2.3, 0], look: [-.5, 2, -1.2],
      on: () => { $('game').style.filter = ''; setTimeout(() => $('game').style.transition = '', 1700); sfx('fanfare'); } },
    { text: 'Is this a dream? Something sparkles outside the window.', d: 3.5, pos: [0, 2, 2.5], look: [6.5, 3.5, 11.8] },
  ], () => { objective('Find the key outside your window'); toast('Dreamland', 'Tip: jump on the toy chest to reach the window'); });""",
"""    { text: 'Long before Sebastian ever came to Dreamland… someone was already here.', d: 4, snap: true, pos: [1.5, 2.6, 1.5], look: [-3.4, .8, -3] },
    { text: 'You are the DREAM SELF. The part of Sebastian that stays behind when he wakes up.', d: 4.2, pos: [0, 2.3, 0], look: [-.5, 1, -1.2] },
    { text: 'Every morning he leaves. Every night you wait. This is your story.', d: 4, pos: [0, 2, 2.5], look: [0, 2, 9] },
  ], () => { objective('Go out the window'); toast('You are the Dream Self', 'Your light is on. Stay near the warm lights when you feel scared'); });""")
# keys are MEMORIES in this game
R("    state.keys = p.n; sfx('key'); hud();", "    state.keys++; sfx('key'); hud();")
R("    if (p.n === 1) gateCine(); else if (p.n === 2) endingCine(); else if (p.n === 10) revealCine(); else areaKeyCine(p);", "    areaKeyCine(p);")
R("    { text: `KEY ${k.n} of 10!`,", "    { text: `MEMORY ${state.keys} of 5`,")
R("      if (AREAS[to]) enterArea(to); else chapterEnd();", "      if (AREAS[to]) enterArea(to); else nmEnding();")
# ---------- the nightmare layer ----------
R("scene.add(new THREE.HemisphereLight(0xffd8f6, 0x7a2fb0, 0.95));", "const hemi = new THREE.HemisphereLight(0x8a6aa8, 0x1a0a20, 0.42); scene.add(hemi); // dim, cold night light")
R("r.visor.material.color.setHex(r.glitchOn > 0 ? 0xff3fd0 : r.alerted ? 0xff8fd8 : 0x5ff6ff);", "r.visor.material.color.setHex(r.glitchOn > 0 ? 0xffffff : r.alerted ? 0xffa020 : 0xff2a2a); // red eyes, orange when they see you")
R("q[i * 3 + 1] += dt * .25; q[i * 3] += Math.sin(time * .6 + dust.seed[i]) * dt * .15; if (q[i * 3 + 1] > 14) q[i * 3 + 1] = 0; }",
  "q[i * 3 + 1] -= dt * .5; q[i * 3] += Math.sin(time * .6 + dust.seed[i]) * dt * .3; if (q[i * 3 + 1] < -.5) q[i * 3 + 1] = 14; } // ash falling")
R("// everything solid casts and catches shadows (glowing things and the sky don't)", NM_JS + "\n// everything solid casts and catches shadows (glowing things and the sky don't)")
R("  updateFar(time);\n", "  updateFar(time);\n  nightmareTick(dt, time);\n  emotionTick(dt, time);\n")
R("function introCine() {", "let introCine = function () {")
R("name: 'Glitch Octopus'", "name: 'Sadness Octopus'")
R("name: 'Storm Machine'", "name: 'Storm of Pride'")
R("name: 'Robot Principal'", "name: 'Angry Principal'")
i = s.rindex('</style>'); s = s[:i] + NM_CSS + s[i:]
open(os.path.join(ROOT, 'nightmareland.html'), 'w').write(s)
print('built nightmareland.html')
