import { TrafficRenderer } from './renderer3d.js?v=dcf7a9ed0c8b';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=369366e505c5');
await import('./member.js?v=8fc81ba1a787');
