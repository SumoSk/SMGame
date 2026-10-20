import { TrafficRenderer } from './renderer3d.js?v=5ae8eb792ae8';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=c8a7747465f1');
