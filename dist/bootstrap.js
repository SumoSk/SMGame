import { TrafficRenderer } from './renderer3d.js?v=304f8eeb22a7';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5af5c26ae2a1');
