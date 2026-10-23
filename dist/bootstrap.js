import { TrafficRenderer } from './renderer3d.js?v=ee623fea2898';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=9d67b5cbe4fb');
await import('./member.js?v=8fc81ba1a787');
