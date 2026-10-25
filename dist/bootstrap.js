import { TrafficRenderer } from './renderer3d.js?v=854f4c243edb';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=40f0e6ad1b22');
await import('./member.js?v=6013d475a727');
