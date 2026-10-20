import { TrafficRenderer } from './renderer3d.js?v=7c5296a0c32c';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5f784313d044');
