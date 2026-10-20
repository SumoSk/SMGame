import { TrafficRenderer } from './renderer3d.js';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js');
