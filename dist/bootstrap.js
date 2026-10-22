import { TrafficRenderer } from './renderer3d.js?v=f207b87682cd';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=b80ba968025c');
await import('./member.js?v=4ab9b2d0361e');
