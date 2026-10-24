import { TrafficRenderer } from './renderer3d.js?v=8ae8939ad710';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=2bfb842380a6');
await import('./member.js?v=8fc81ba1a787');
