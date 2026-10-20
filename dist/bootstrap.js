import { TrafficRenderer } from './renderer3d.js?v=16d0205bb4a9';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=f6794e797e67');
