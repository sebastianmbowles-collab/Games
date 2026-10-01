# TADC sprite tools

The game's sprites live in `src/games/tadc/art.js`. They are made here.

## Current sprites: hand-built figures

`figures.js` draws every character facing forward (Pomni, Ragatha, Jax, Kinger, Gangle, Caine,
Bubble, Zooble) with simple shapes, using a lineup of fan art the player shared as a reference
for colours and outfits. Each figure also says where its eyes are, so the game can draw pupils
that follow Pomni.

`node tools/tadc-sprites/gen.mjs` renders every entry in `gen-specs.json` (poses are just
different arm/leg positions), shrinks it to 8-bit pixels with a dark outline, and writes
`src/games/tadc/art.js`. It needs the global Playwright install.

## Older sprites: the TADC Gang Pack (Stick Nodes)

`pack/` holds the original Stick Nodes figures. `sndump` turns them into JSON (with the
[sticknodes-rs](https://github.com/vinceTheProgrammer/sticknodes-rs) library), `snrender.js`
draws them and `pixelize.mjs` shrinks them, using `specs-final.json`. The game no longer uses
these, but they are kept in case you want to go back to them.
