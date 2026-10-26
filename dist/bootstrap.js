import { TrafficRenderer } from './renderer3d.js?v=74c195bec1f6';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=da0d91bc148d');
await import('./member.js?v=6013d475a727');
