import { TrafficRenderer } from './renderer3d.js?v=92cff5d5ed18';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=a92e9b724125');
await import('./member.js?v=8fc81ba1a787');
