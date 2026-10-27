import { TrafficRenderer } from './renderer3d.js?v=c4aa4e76b5e1';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=a646d3654806');
await import('./member.js?v=464355c2f43c');
