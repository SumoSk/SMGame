import { TrafficRenderer } from './renderer3d.js?v=600a9931e04a';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=2369b6e570cd');
await import('./member.js?v=464355c2f43c');
