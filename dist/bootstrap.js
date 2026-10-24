import { TrafficRenderer } from './renderer3d.js?v=37e6c87cd84d';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=fc70cc8ccd80');
await import('./member.js?v=8fc81ba1a787');
