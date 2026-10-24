import { TrafficRenderer } from './renderer3d.js?v=711c0c48f6ee';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=d354df900518');
await import('./member.js?v=8fc81ba1a787');
