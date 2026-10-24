import { TrafficRenderer } from './renderer3d.js?v=e3ecce1de605';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=718c44c6c216');
await import('./member.js?v=700da8bcb54f');
