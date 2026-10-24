import { TrafficRenderer } from './renderer3d.js?v=919f9377420c';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=377a6660dea6');
await import('./member.js?v=6013d475a727');
