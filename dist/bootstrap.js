import { TrafficRenderer } from './renderer3d.js?v=6c7ae27a6d3c';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=d4a5d28795ae');
await import('./member.js?v=6013d475a727');
