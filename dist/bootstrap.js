import { TrafficRenderer } from './renderer3d.js?v=6a1c46c07d75';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=da8b256898de');
await import('./member.js?v=8fc81ba1a787');
