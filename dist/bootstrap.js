import { TrafficRenderer } from './renderer3d.js?v=e811afd6f6c5';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=c38e3492e22c');
await import('./member.js?v=8fc81ba1a787');
