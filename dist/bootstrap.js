import { TrafficRenderer } from './renderer3d.js?v=1a72fa5501fc';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=ea76fe207381');
await import('./member.js?v=6013d475a727');
