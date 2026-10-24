import { TrafficRenderer } from './renderer3d.js?v=3f6b2bb1bbb1';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=234ac35e77b3');
await import('./member.js?v=a60ead1ff36b');
