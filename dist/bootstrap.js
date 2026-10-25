import { TrafficRenderer } from './renderer3d.js?v=ecda558ffd27';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=b84ea4804c5c');
await import('./member.js?v=6013d475a727');
