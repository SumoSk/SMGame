import { TrafficRenderer } from './renderer3d.js?v=5ad269b6ce53';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=68ebfff3e8a7');
await import('./member.js?v=eadfc5b48682');
