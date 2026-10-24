import { TrafficRenderer } from './renderer3d.js?v=03a4b8206bbb';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=cbcaf697093d');
await import('./member.js?v=8fc81ba1a787');
