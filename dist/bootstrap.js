import { TrafficRenderer } from './renderer3d.js?v=b8b6fc49eb35';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=b9040c804be1');
await import('./member.js?v=464355c2f43c');
