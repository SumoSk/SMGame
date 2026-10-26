import { TrafficRenderer } from './renderer3d.js?v=4c464d061ea5';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=603b3bf18ca2');
await import('./member.js?v=464355c2f43c');
