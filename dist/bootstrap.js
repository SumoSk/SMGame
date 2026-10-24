import { TrafficRenderer } from './renderer3d.js?v=2ea8effed011';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=4a764bea853b');
await import('./member.js?v=8fc81ba1a787');
