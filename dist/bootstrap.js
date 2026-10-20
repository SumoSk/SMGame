import { TrafficRenderer } from './renderer3d.js?v=9b62d17c8f1f';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=71de47304e91');
