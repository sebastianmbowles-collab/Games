# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## ANTE UP: HOUSE RULES

`AnteUp.html` is a first-person psychological horror game, all in one file. Open it in a desktop browser (headphones recommended).
Five acts against the Dealer (Blind Man's Bluff, the Carved Labyrinth, the Soul Scale, the Chess of Glass and Russian Roulette Backgammon), timed intermissions to explore the cellar, and four endings.
Source lives in `src/ante-up/`; rebuild the file with `npm run build:au`.

## RUN LITTLE BUNNY!

`RunLittleBunny.html` is a hand-drawn side-scrolling adventure, all in one file. Open it in any browser (keyboard, touch joystick or game controller).
Little Bunny forages across Bunwood to feed his family of 7 siblings before winter:

| Area | Danger | Minigame |
|---|---|---|
| Carrot Meadows | Fox | Carrot Picking |
| Mushroom Valley | Fox, Wildcat | Mushroom Match |
| Whispering Woods | Owl, Wildcat, Wolf | Berry Sorting |
| Thorny Thicket | Owl, Wolf (twice) | Butterfly Catcher |
| Bunny Burrows (home) | none | Bunny's Garden, Burrow Cleaning |

Pick an area on the map, run to the hollow log, and hide from predators along the way. If one catches him, his siblings pull him down a secret tunnel, but the food from that trip is lost. Minigame food goes straight to the pantry. Finishing the Thorny Thicket shows the ending. Progress is saved in the browser.

## EGGSHELL: BOMBING

`EggshellBombing.html` is an 8-bit war game about eggs, all in one file. Open it in any browser (keyboard, or touch buttons on a tablet or phone held sideways).
Private Shelly, a white egg, fights in Egg War III to win back the Golden Egg from the Rotten Egg, and grows older and gets promoted chapter by chapter:

| Chapter | Mode | View |
|---|---|---|
| 1. The Raid | Running: escape the bomber to the bunker | Third person |
| 2. The Egg Factory | Building: put parts together before time runs out | Third person |
| 3. Hold the Line | Survival: build a shelter, then repair it under fire | Third person |
| 4. Wings of Shell | Bombing: bombs land 2 seconds late; don't hit prisoners | Bird's eye |
| 5. Iron Shell | Tanking: bases, the Stinker, then the Golden Egg | Third person |

Supplies built in the factory carry into the other modes. Voice lines are listed in `EggshellVoiceScript.md`; recordings go in a `voices/` folder.
Source lives in `src/eggshell/`; rebuild the file with `sh src/eggshell/build.sh`.

## IVY AND THE QUEST FOR MORE DESSERT

`IvyDessertQuest.html` is a colourful 2D platform adventure starring Ivy and her big brother Sebastian, all in one file. Open it in any browser (keyboard, touch buttons or game controllers). 1 or 2 players.
Lord Licorice has stolen every dessert in the world. Ivy and Sebastian travel across seven kingdoms to stop him:

| World | Levels | Boss |
|---|---|---|
| 1. Candy Forest | Sweet Beginnings, Lollipop Woods, The Chocolate River | Ginger Grim |
| 2. Gingerbread Kingdom | Biscuit Village, Cookie Caves, The Crumb Mines | Crumb Goblin |
| 3. Frosting Peaks | Ice Cream Slopes, Frozen Sprinkle Lake, The Melting Glacier | Meltmaster |
| 4. Donut Mountains | Sprinkle Valley, Donut Hills, Jellybean Jungle | Donut Doom |
| 5. The Sugar Kingdom | Sugar Gardens, Candy Cane Castle, The Magical Bakery | The Candy Wizard |
| 6. Chocolate Volcano | Cocoa Caverns, Caramel Lava, The Chocolate Factory | The Cake Eater |
| 7. Licorice Castle | The Dark Bakery, The Royal Kitchen, The Dessert Vault | Lord Licorice, then a secret final boss |
| Bonus: Pudding Isles (10 spoons) | | Chocobun, Cupcake Chaos, Jelly Jaws |
| Bonus: Royal Pudding Vault (20 spoons) | | Marshmallow Max, Captain Custard |

- Moves: run, jump, double jump, climb ladders, swim through chocolate, bounce on marshmallows.
- Abilities: Ivy's Sugar Rush and Sebastian's Big Brother Boost (fill the meter with cupcakes and coins).
- Power-ups: Sugar Cupcake, Candy Shield, Mega Cookie, Rainbow Lollipop.
- Every level hides a golden spoon (behind a fake wall), a hidden star and a dessert card. The x-2 levels hide a secret door that unlocks a secret level.
- Dessert Shop (costumes and power-ups for coins), Card Album, Boss Rematch, and a secret ending for finding all 21 hidden stars.
- Soundtrack: 13 songs written as notes in `src/ivy/15_music.js` (title, one per world, bonus, boss, final boss, victory, ending), with melody, bass, sparkle notes and drums.

Source lives in `src/ivy/`; rebuild the file with `sh src/ivy/build.sh`.
