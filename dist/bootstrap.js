import { TrafficRenderer } from './renderer3d.js?v=32c18b60f7c7';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=1ba975b452d4');
await import('./member.js?v=6013d475a727');
