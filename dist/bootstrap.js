import { TrafficRenderer } from './renderer3d.js?v=91c2f3dbf4c8';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=83a4247760e5');
await import('./member.js?v=f91c3b32dcff');
