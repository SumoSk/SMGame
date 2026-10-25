import { TrafficRenderer } from './renderer3d.js?v=32c18b60f7c7';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=90ef8fc3d3e2');
await import('./member.js?v=6013d475a727');
