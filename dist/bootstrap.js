import { TrafficRenderer } from './renderer3d.js?v=233c16db74b8';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=64c02284e5c4');
await import('./member.js?v=9a8fddc03610');
