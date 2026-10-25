import { TrafficRenderer } from './renderer3d.js?v=bc726e0f5edb';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=30a46f6735c0');
await import('./member.js?v=6013d475a727');
