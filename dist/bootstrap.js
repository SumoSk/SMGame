import { TrafficRenderer } from './renderer3d.js?v=162c3d86e3bc';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=a646d3654806');
await import('./member.js?v=464355c2f43c');
