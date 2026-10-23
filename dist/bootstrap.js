import { TrafficRenderer } from './renderer3d.js?v=1bb8de08ef46';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=afc3e879873b');
await import('./member.js?v=a706c52c4bfa');
