import { TrafficRenderer } from './renderer3d.js?v=63bf26204e6e';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=488788d0a850');
await import('./member.js?v=6013d475a727');
