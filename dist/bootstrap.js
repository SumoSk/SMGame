import { TrafficRenderer } from './renderer3d.js?v=8c6fd6a4f4a2';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=c880c338af0c');
await import('./member.js?v=9a8fddc03610');
