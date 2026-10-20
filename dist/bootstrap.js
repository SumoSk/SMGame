import { TrafficRenderer } from './renderer3d.js?v=db4aad23c43f';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=48a6ac36a177');
