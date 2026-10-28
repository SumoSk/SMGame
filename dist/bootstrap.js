import { TrafficRenderer } from './renderer3d.js?v=219be51e25c6';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5d2478008a8e');
await import('./member.js?v=eadfc5b48682');
