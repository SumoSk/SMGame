import { TrafficRenderer } from './renderer3d.js?v=31143ecdbe59';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=80e4dba6f35a');
await import('./member.js?v=6013d475a727');
