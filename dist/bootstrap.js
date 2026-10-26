import { TrafficRenderer } from './renderer3d.js?v=bc726e0f5edb';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=c4cf89d76630');
await import('./member.js?v=6013d475a727');
