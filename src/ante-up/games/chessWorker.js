import { search } from './chessEngine.js';
self.onmessage = e => {
  const { g, depth, ms, noise, id } = e.data;
  const r = search(g, depth, ms, noise);
  self.postMessage({ id, move: r && r.move, score: r ? r.score : 0 });
};
