import { TrafficRenderer } from './renderer3d.js?v=22e355eb87d4';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=fc26eaadbb1d');
await import('./member.js?v=6013d475a727');
