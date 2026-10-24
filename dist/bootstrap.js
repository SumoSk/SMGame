import { TrafficRenderer } from './renderer3d.js?v=2ea8effed011';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=f1dae5dc79b7');
await import('./member.js?v=a60ead1ff36b');
