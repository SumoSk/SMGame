import { TrafficRenderer } from './renderer3d.js?v=b8b6fc49eb35';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=c1eaa10c7afe');
await import('./member.js?v=464355c2f43c');
