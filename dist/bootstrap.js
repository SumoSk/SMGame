import { TrafficRenderer } from './renderer3d.js?v=e3ecce1de605';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=dc548f9955e5');
await import('./member.js?v=5d61f8b6d0b4');
