import { TrafficRenderer } from './renderer3d.js?v=1a72fa5501fc';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=1c0a624134f7');
await import('./member.js?v=6013d475a727');
