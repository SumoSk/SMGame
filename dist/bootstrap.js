import { TrafficRenderer } from './renderer3d.js?v=ca182d42d37c';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=713532ad5e46');
await import('./member.js?v=eadfc5b48682');
