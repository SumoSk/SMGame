import { TrafficRenderer } from './renderer3d.js?v=bc7b380f6ab7';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=17818c46ae68');
await import('./member.js?v=8fc81ba1a787');
