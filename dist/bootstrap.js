import { TrafficRenderer } from './renderer3d.js?v=5fcfae1f4c55';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=ba6670ae7a90');
await import('./member.js?v=8fc81ba1a787');
