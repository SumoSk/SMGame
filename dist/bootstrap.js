import { TrafficRenderer } from './renderer3d.js?v=perspective-20261030-1';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=oneblock-20261030-1');
await import('./member.js?v=eadfc5b48682');
