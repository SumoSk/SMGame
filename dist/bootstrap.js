import { TrafficRenderer } from './renderer3d.js?v=5a90ffda1409';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=9d67b5cbe4fb');
await import('./member.js?v=8fc81ba1a787');
