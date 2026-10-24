import { TrafficRenderer } from './renderer3d.js?v=671d536d8e9f';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=3e43152c8238');
await import('./member.js?v=8fc81ba1a787');
