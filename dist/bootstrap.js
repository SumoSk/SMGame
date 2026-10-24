import { TrafficRenderer } from './renderer3d.js?v=e811afd6f6c5';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=cca9c251a233');
await import('./member.js?v=8fc81ba1a787');
