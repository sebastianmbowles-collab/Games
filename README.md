# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## The Wicked Side

A first-person 3D horror game set in Grandma's two-storey cottage. Open
`the-wicked-side.html` in a browser (it loads three.js from a CDN, so it needs
an internet connection; no build step).

Press Space to cross between the Normal Side and the Wicked Side, find the six
mirror shards (they only exist on the Wicked Side, two of them upstairs) and
escape through the front door. Watch out for:

- **Book** (downstairs): a tall, skinny, reddish-brown creature with visible
  bones and a book for a head. It lurks in the library and freezes while your
  flashlight is on it.
- **Luna**: your dog. On the Normal Side she follows you around and whines
  when danger is close. On the Wicked Side she is wolf-like, with a wide-open
  mouth, red eyes and sixteen bubble eyes, and she hunts by sound (hold C to
  sneak).
- **The Moth** (upstairs): a towering moth with eye-spotted wings that flies
  straight at your flashlight. Press F to turn the light off.

Hide in wardrobes or under beds with E, as long as nothing sees you get in.
Grandma's handwritten notes are scattered around the cottage (E to read).
