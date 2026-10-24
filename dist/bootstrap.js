import { TrafficRenderer } from './renderer3d.js?v=e3ecce1de605';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=27d8c97f6732');
await import('./member.js?v=8fc81ba1a787');
