import { TrafficRenderer } from './renderer3d.js?v=4d8b4f5ec512';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=2c78d91ae3be');
