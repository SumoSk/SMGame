import { TrafficRenderer } from './renderer3d.js?v=8152d7253cb2';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=dc60aeb2240f');
await import('./member.js?v=9a8fddc03610');
