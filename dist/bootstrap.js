import { TrafficRenderer } from './renderer3d.js?v=f676833cd76e';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=b0bbaa9c8376');
await import('./member.js?v=a8bd0e0ae1ed');
