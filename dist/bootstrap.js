import { TrafficRenderer } from './renderer3d.js?v=1293d09a0a93';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=f2368a8bb59d');
await import('./member.js?v=6013d475a727');
