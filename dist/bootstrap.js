import { TrafficRenderer } from './renderer3d.js?v=0ca0b8edc87b';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=570f2c8ced45');
await import('./member.js?v=6013d475a727');
