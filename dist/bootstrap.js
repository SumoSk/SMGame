import { TrafficRenderer } from './renderer3d.js?v=6bf36b917c59';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=c8f457dffa5f');
await import('./member.js?v=6013d475a727');
