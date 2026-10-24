import { TrafficRenderer } from './renderer3d.js?v=9632d52e0f59';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=f0ea08b41fac');
await import('./member.js?v=8fc81ba1a787');
