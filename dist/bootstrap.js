import { TrafficRenderer } from './renderer3d.js?v=5d3fb07dc3a0';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=659402f50f2c');
await import('./member.js?v=6013d475a727');
