import { TrafficRenderer } from './renderer3d.js?v=bf489eee0064';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=1a2fdc6643dd');
