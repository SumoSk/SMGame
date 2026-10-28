import { TrafficRenderer } from './renderer3d.js?v=8152d7253cb2';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=e38103996fd4');
await import('./member.js?v=eadfc5b48682');
