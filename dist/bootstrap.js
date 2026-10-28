import { TrafficRenderer } from './renderer3d.js?v=112f1f92fa76';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=bca72399975b');
await import('./member.js?v=eadfc5b48682');
