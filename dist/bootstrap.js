import { TrafficRenderer } from './renderer3d.js?v=56d1a7087add';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5460c624e6f2');
await import('./member.js?v=8fc81ba1a787');
