import { TrafficRenderer } from './renderer3d.js?v=c4d37df4aa58';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=755f0c1b9598');
await import('./member.js?v=9a8fddc03610');
