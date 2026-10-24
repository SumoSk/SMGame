import { TrafficRenderer } from './renderer3d.js?v=3f6b2bb1bbb1';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5df6c173685b');
await import('./member.js?v=8fc81ba1a787');
