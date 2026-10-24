import { TrafficRenderer } from './renderer3d.js?v=92cff5d5ed18';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=f0ea08b41fac');
await import('./member.js?v=a60ead1ff36b');
