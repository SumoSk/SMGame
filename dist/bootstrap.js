import { TrafficRenderer } from './renderer3d.js?v=112f1f92fa76';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=61b0fedd3e4c');
await import('./member.js?v=eadfc5b48682');
