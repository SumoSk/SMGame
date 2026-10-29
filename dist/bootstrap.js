import { TrafficRenderer } from './renderer3d.js?v=5ad269b6ce53';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=e5b73aeb33d3');
await import('./member.js?v=eadfc5b48682');
