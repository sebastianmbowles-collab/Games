# Seb's Arcade

A little arcade of browser games, made with React and Vite.

| Game | What it is |
| --- | --- |
| 🔨 **BONK!** | A 3D rubber duck balloon brawl. Pop everyone's balloons with a giant hammer. |
| 🥊 **Animal Brawl** | A street-fighter style showdown between 18 punny animals. |
| 🍓 **Jam** | Toss in fruit, stir the pot and fill jars. No winning, just jam! |
| 🃏 **TADC: Boss Rush** | An 8-bit Amazing Digital Circus boss rush. Pomni can only run and jump. Everyone else is a boss! |

## Playing

- **Easiest:** open `arcade.html` in a browser. It is the whole arcade in one file, so it works offline too.
- **While working on the code:**

  ```sh
  npm install
  npm run dev
  ```

  Then open the address it prints.

## Building

```sh
npm run build:standalone           # makes standalone-build/index.html
cp standalone-build/index.html arcade.html
npm run lint                       # checks the code
```

## TADC: Boss Rush

Pomni can't fight back. To beat a boss, she has to **survive their whole show**. One hit and you're out!

### Controls

| | Keyboard | Controller | Touch |
| --- | --- | --- | --- |
| Move | Arrow keys / A D | D-pad or left stick | ◀ ▶ |
| Jump | Z / Space / Up | A | A |
| Pause | Enter | START | START |
| Back | X / Esc | B | tap *B: BACK* |
| Sound on/off | M | | OPTIONS |

Hold a direction to run faster. Let go of jump early for a small hop.

### The bosses

1. **Jax** throws whoopie cushions. They stay on the floor, so watch where you land.
2. **Ragatha** throws buttons every which way. Low buttons: jump. High buttons: stay down.
3. **Gangle**'s ribbons fill the screen. The flashing outline shows where they will be.
4. **Kinger** throws pillows. Running into one is out, but standing on top is safe.
5. **Caine and Bubble** swing one absurdly huge cane, while Bubble makes the floor slippery.

### Helpers

- **Difficulty:** EASY, NORMAL, HARD or INSANE (in OPTIONS).
- **Practice:** in BOSSES, pick a boss and use up and down to start from any part of the fight. Press START to watch Pomni play it by herself!
- **Hints:** if a boss keeps beating you, the game over screen gives you a tip.
- **Continue:** left in the middle of a run? Pick CONTINUE on the title screen to carry on from that boss.
- **Calm mode** turns off screen shake and big flashes. **Slow motion** plays fights at 3/4 speed (those runs don't count for records).

### Extras

- **Records:** best times per difficulty, speedrun splits (gold = your fastest ever), and your nemesis.
- **Badges and outfits:** earn badges, then dress Pomni up in new colours in OPTIONS. Beat a boss on HARD to play as them!
- **Jukebox** (in OPTIONS): listen to every song while Pomni dances.

<details>
<summary>Secrets (spoilers!)</summary>

- Beat all five bosses to unlock **ENCORE** (every boss again, faster and faster), **CHALLENGES** (bosses with a twist) and a secret bonus boss: **Zooble**.
- The challenges: LIGHTS OUT, MOON BOUNCE, DOUBLE TIME, TREADMILL, ICE RINK, POGO and NO MERCY. Finish them all for the **SHOWSTOPPER** badge.
- Beat Kinger without ever touching the floor for the **PILLOW MASTER** badge.
- Collect every badge for a rainbow **100%** on the title screen.
- Leave the title screen alone for a while... Pomni might notice you.
- On the title screen, press **Up Up Down Down Left Right Left Right** (or tap Pomni five times).

</details>

### Making the sprites

The characters are drawn as simple shapes in `tools/tadc-sprites/figures.js`, then shrunk to pixel art by
`tools/tadc-sprites/gen.mjs`, which writes `src/games/tadc/art.js`. See `tools/tadc-sprites/README.md`.
