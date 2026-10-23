import { TrafficRenderer } from './renderer3d.js?v=3a7d6fa84380';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=ed33505b210d');
await import('./member.js?v=8fc81ba1a787');
