import { TrafficRenderer } from './renderer3d.js?v=2c93cbc52032';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=1c413806ad81');
await import('./member.js?v=6013d475a727');
