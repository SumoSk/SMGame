import { TrafficRenderer } from './renderer3d.js?v=32c177208495';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=9f4cf29a7bd3');
await import('./member.js?v=8fc81ba1a787');
