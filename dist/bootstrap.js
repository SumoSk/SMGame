import { TrafficRenderer } from './renderer3d.js?v=fdf241a7e667';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=210f4d9467f5');
await import('./member.js?v=8fc81ba1a787');
