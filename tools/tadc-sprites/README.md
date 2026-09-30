# TADC sprite converter

Turns the Stick Nodes figures in `pack/` (the TADC Gang Pack) into the 8-bit sprites in
`src/games/tadc/art.js`.

1. `sndump` reads each `.nodes` file and writes a `.json` next to it, using the
   [sticknodes-rs](https://github.com/vinceTheProgrammer/sticknodes-rs) library:
   `cd sndump && RUSTC_BOOTSTRAP=1 cargo run --release -- ../pack/*.nodes`
   (the library needs the Cargo.lock from its own repo, and `RUSTC_BOOTSTRAP=1` for one dependency).
2. `node pixelize.mjs` draws every figure in headless Chromium with `snrender.js`, shrinks it to
   pixels, adds a dark outline, and writes `art.json` plus `preview.png`. Poses (running, jumping,
   waving) are made by turning bones in `specs-final.json`.
3. Turn `art.json` into `src/games/tadc/art.js` (see the header of that file for the format).
