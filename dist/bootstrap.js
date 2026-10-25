import { TrafficRenderer } from './renderer3d.js?v=854f4c243edb';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=fc89936e492c');
await import('./member.js?v=6013d475a727');
