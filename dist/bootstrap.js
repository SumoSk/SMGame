import { TrafficRenderer } from './renderer3d.js?v=946dcb94f381';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=be68b30f3bcc');
await import('./member.js?v=a60ead1ff36b');
