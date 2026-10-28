import { TrafficRenderer } from './renderer3d.js?v=842d0d7fa511';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=713532ad5e46');
await import('./member.js?v=eadfc5b48682');
