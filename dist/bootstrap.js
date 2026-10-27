import { TrafficRenderer } from './renderer3d.js?v=5c95a29a4d15';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=7740a2f0d3e2');
await import('./member.js?v=9a8fddc03610');
